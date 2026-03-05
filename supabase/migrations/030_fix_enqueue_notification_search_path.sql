-- 030_fix_enqueue_notification_search_path.sql
-- Fix: Qualify notification_queue with public. schema prefix
--
-- Bug: enqueue_speech_notification() uses SET search_path = '' but
-- references notification_queue without the public. prefix in all 4 places
-- (3 INSERTs + 1 UPDATE). This causes "relation notification_queue does not exist"
-- errors on any speech status change that triggers notification insertion.
--
-- Fix: Add public. prefix to all 4 references to notification_queue.
-- Full function body copied from migration 028 with only schema qualification added.

CREATE OR REPLACE FUNCTION enqueue_speech_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire on status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Case 1: Assignment notification (delayed, grouped)
  -- Only fires on initial assignment: not_assigned -> assigned_not_invited
  -- Manual status reverts to assigned_not_invited do NOT trigger notification
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';
