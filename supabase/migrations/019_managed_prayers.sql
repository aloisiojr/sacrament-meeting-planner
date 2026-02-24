-- 019_managed_prayers.sql
-- CR-221: Managed Prayers (Oracoes Gerenciadas)
-- Migrates prayer data from sunday_agendas columns to speeches table
-- positions 0 (opening) and 4 (closing). Adds per-ward manage_prayers toggle.
--
-- CRITICAL ORDER: copy data BEFORE dropping columns.

-- =============================================================================
-- Step 1: Add new columns to wards
-- =============================================================================
ALTER TABLE public.wards
  ADD COLUMN manage_prayers BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN whatsapp_template_opening_prayer TEXT,
  ADD COLUMN whatsapp_template_closing_prayer TEXT;

-- =============================================================================
-- Step 2: Copy opening prayers to speeches position 0
-- =============================================================================
INSERT INTO public.speeches (ward_id, sunday_date, position, member_id, speaker_name, status)
SELECT
  sa.ward_id,
  sa.sunday_date,
  0 AS position,
  sa.opening_prayer_member_id AS member_id,
  sa.opening_prayer_name AS speaker_name,
  'assigned_confirmed' AS status
FROM public.sunday_agendas sa
WHERE sa.opening_prayer_name IS NOT NULL
ON CONFLICT (ward_id, sunday_date, position) DO NOTHING;

-- =============================================================================
-- Step 3: Copy closing prayers to speeches position 4
-- =============================================================================
INSERT INTO public.speeches (ward_id, sunday_date, position, member_id, speaker_name, status)
SELECT
  sa.ward_id,
  sa.sunday_date,
  4 AS position,
  sa.closing_prayer_member_id AS member_id,
  sa.closing_prayer_name AS speaker_name,
  'assigned_confirmed' AS status
FROM public.sunday_agendas sa
WHERE sa.closing_prayer_name IS NOT NULL
ON CONFLICT (ward_id, sunday_date, position) DO NOTHING;

-- =============================================================================
-- Step 4: Drop old columns from sunday_agendas
-- =============================================================================
ALTER TABLE public.sunday_agendas
  DROP COLUMN opening_prayer_member_id,
  DROP COLUMN opening_prayer_name,
  DROP COLUMN closing_prayer_member_id,
  DROP COLUMN closing_prayer_name;

-- =============================================================================
-- Step 5: Update notification trigger to check manage_prayers for positions 0/4
-- =============================================================================
CREATE OR REPLACE FUNCTION enqueue_speech_notification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manage_prayers BOOLEAN;
BEGIN
  -- Only fire on status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- For prayer positions (0 and 4), check if manage_prayers is enabled
  IF NEW.position IN (0, 4) THEN
    SELECT manage_prayers INTO v_manage_prayers
    FROM wards WHERE id = NEW.ward_id;
    IF NOT COALESCE(v_manage_prayers, false) THEN
      RETURN NEW; -- Skip notification when manage_prayers is OFF
    END IF;
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
$$ LANGUAGE plpgsql;
