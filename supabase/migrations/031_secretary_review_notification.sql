-- 031_secretary_review_notification.sql
-- Schema changes and trigger restructure for secretary review notifications (CR-276)
--
-- 1. Add assigned_by_role TEXT column to speeches (nullable, no default)
-- 2. Add topic_title TEXT column to notification_queue
-- 3. Drop/recreate CHECK constraint on notification_queue.type to include 'secretary_review'
-- 4. Restructure enqueue_speech_notification() trigger function:
--    - Case 6B (topic change) placed BEFORE status-change early-return (ADR-036)
--    - Case 6A (secretary speaker assignment) placed AFTER existing cases
--    - All existing cases (1, 4, 5, cancellation) unchanged
--
-- ADR-035: assigned_by_role column for trigger role detection
-- ADR-036: Topic check before status-change early-return
-- ADR-037: secretary_review immediate, never grouped
-- ADR-038: Topic clearing (→ NULL) does NOT notify

-- 1. Add assigned_by_role to speeches
ALTER TABLE public.speeches ADD COLUMN assigned_by_role TEXT;

-- 2. Add topic_title to notification_queue
ALTER TABLE public.notification_queue ADD COLUMN topic_title TEXT;

-- 3. Update CHECK constraint to include 'secretary_review'
ALTER TABLE public.notification_queue DROP CONSTRAINT notification_queue_type_check;
ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_type_check
  CHECK (type IN ('designation', 'weekly_assignment', 'weekly_confirmation',
                  'speaker_confirmed', 'speaker_withdrew', 'secretary_review'));

-- 4. Restructured trigger function
CREATE OR REPLACE FUNCTION enqueue_speech_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Case 6B: Secretary topic change (BEFORE early-return, ADR-036)
  -- Detects topic changes even when status is unchanged.
  -- Does NOT fire on topic clearing (NULL guard, ADR-038).
  IF TG_OP = 'UPDATE'
    AND NEW.assigned_by_role = 'secretary'
    AND NEW.position IN (1, 2, 3)
    AND OLD.topic_title IS DISTINCT FROM NEW.topic_title
    AND NEW.topic_title IS NOT NULL
  THEN
    INSERT INTO public.notification_queue (
      ward_id, type, sunday_date, speech_position, speaker_name,
      topic_title, target_role, status, send_after
    ) VALUES (
      NEW.ward_id, 'secretary_review', NEW.sunday_date,
      NEW.position, NEW.speaker_name, NEW.topic_title,
      'bishopric', 'pending', now()
    );
  END IF;

  -- Early-return: only fire remaining cases on status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Case 1: Assignment notification (delayed, grouped)
  -- Only fires on initial assignment: not_assigned -> assigned_not_invited
  -- (ADR-025: strict positive equality guard)
  IF NEW.status = 'assigned_not_invited'
    AND (TG_OP = 'INSERT' OR OLD.status = 'not_assigned') THEN
    INSERT INTO public.notification_queue (
      ward_id, type, sunday_date, speech_position, speaker_name,
      target_role, status, send_after
    ) VALUES (
      NEW.ward_id,
      'designation',
      NEW.sunday_date,
      NEW.position,
      NEW.speaker_name,
      'secretary',
      'pending',
      now() + INTERVAL '5 minutes'
    );
  END IF;

  -- Case 4: Speaker confirmed (immediate)
  IF NEW.status = 'assigned_confirmed' AND (TG_OP = 'INSERT' OR OLD.status != 'assigned_confirmed') THEN
    INSERT INTO public.notification_queue (
      ward_id, type, sunday_date, speech_position, speaker_name,
      target_role, status, send_after
    ) VALUES (
      NEW.ward_id,
      'speaker_confirmed',
      NEW.sunday_date,
      NEW.position,
      NEW.speaker_name,
      'secretary_and_bishopric',
      'pending',
      now()
    );
  END IF;

  -- Case 5: Speaker gave up (immediate)
  IF NEW.status = 'gave_up' AND (TG_OP = 'INSERT' OR OLD.status != 'gave_up') THEN
    INSERT INTO public.notification_queue (
      ward_id, type, sunday_date, speech_position, speaker_name,
      target_role, status, send_after
    ) VALUES (
      NEW.ward_id,
      'speaker_withdrew',
      NEW.sunday_date,
      NEW.position,
      NEW.speaker_name,
      'bishopric',
      'pending',
      now()
    );
  END IF;

  -- Cancellation: if speech returns to not_assigned, cancel pending designation notifications
  IF NEW.status = 'not_assigned' AND TG_OP = 'UPDATE' AND OLD.status != 'not_assigned' THEN
    UPDATE public.notification_queue
    SET status = 'cancelled'
    WHERE ward_id = NEW.ward_id
      AND sunday_date = NEW.sunday_date
      AND speech_position = NEW.position
      AND type = 'designation'
      AND status = 'pending';
  END IF;

  -- Case 6A: Secretary speaker assignment (after existing cases)
  -- Only fires for secretary initial speaker assignments on speech positions (1-3)
  IF NEW.assigned_by_role = 'secretary'
    AND NEW.position IN (1, 2, 3)
    AND NEW.status = 'assigned_not_invited'
    AND (TG_OP = 'INSERT' OR OLD.status = 'not_assigned')
  THEN
    INSERT INTO public.notification_queue (
      ward_id, type, sunday_date, speech_position, speaker_name,
      target_role, status, send_after
    ) VALUES (
      NEW.ward_id, 'secretary_review', NEW.sunday_date,
      NEW.position, NEW.speaker_name,
      'bishopric', 'pending', now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
