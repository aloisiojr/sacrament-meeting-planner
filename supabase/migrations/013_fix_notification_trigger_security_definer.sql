-- 013_fix_notification_trigger_security_definer.sql
-- Fix RLS policy error on notification_queue by adding SECURITY DEFINER
-- to the enqueue_speech_notification() trigger function.
--
-- Root cause: The trigger executes in the context of the authenticated user,
-- but notification_queue has RLS enabled with NO policies for authenticated
-- users. Adding SECURITY DEFINER makes the function execute with owner
-- (postgres) privileges, bypassing RLS on notification_queue.
--
-- Precedent: list_ward_users RPC already uses SECURITY DEFINER (migration 006).
-- The function body is identical to 003_notification_triggers.sql.

CREATE OR REPLACE FUNCTION enqueue_speech_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire on status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Case 1: Assignment notification (delayed, grouped)
  -- Triggers when status changes to assigned_not_invited
  IF NEW.status = 'assigned_not_invited' THEN
    INSERT INTO notification_queue (
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
    INSERT INTO notification_queue (
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
    INSERT INTO notification_queue (
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
    UPDATE notification_queue
    SET status = 'cancelled'
    WHERE ward_id = NEW.ward_id
      AND sunday_date = NEW.sunday_date
      AND speech_position = NEW.position
      AND type = 'designation'
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
