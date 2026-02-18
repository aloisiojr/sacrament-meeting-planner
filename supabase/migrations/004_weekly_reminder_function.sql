-- 004_weekly_reminder_function.sql
-- Scheduled function that creates weekly reminder notification queue entries.
--
-- Runs every Sunday. For each ward:
-- 1. Check if next sunday has type "Discursos" (no exception blocking speeches)
-- 2. If any speech is not_assigned -> queue for bishopric at 18:00 ward TZ
-- 3. If any speech is not assigned_confirmed -> queue for secretary at 18:00 ward TZ

-- =============================================================================
-- WEEKLY REMINDER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION create_weekly_reminders()
RETURNS void AS $$
DECLARE
  ward RECORD;
  next_sunday DATE;
  has_exception BOOLEAN;
  has_unassigned BOOLEAN;
  has_unconfirmed BOOLEAN;
  send_time TIMESTAMPTZ;
BEGIN
  -- Calculate next Sunday from today
  next_sunday := CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7);
  -- If today is Sunday, next_sunday is today; we want next week's Sunday
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    next_sunday := CURRENT_DATE + 7;
  END IF;

  -- Process each ward
  FOR ward IN SELECT id, timezone FROM wards LOOP
    -- Check if next sunday has a speech-blocking exception
    SELECT EXISTS (
      SELECT 1 FROM sunday_exceptions
      WHERE ward_id = ward.id
        AND date = next_sunday
        AND reason IN ('general_conference', 'stake_conference')
    ) INTO has_exception;

    -- Skip if next sunday has a blocking exception
    IF has_exception THEN
      CONTINUE;
    END IF;

    -- Check for unassigned speeches (Case 2)
    SELECT EXISTS (
      SELECT 1 FROM speeches
      WHERE ward_id = ward.id
        AND sunday_date = next_sunday
        AND status = 'not_assigned'
    ) INTO has_unassigned;

    -- Check for unconfirmed speeches (Case 3)
    SELECT EXISTS (
      SELECT 1 FROM speeches
      WHERE ward_id = ward.id
        AND sunday_date = next_sunday
        AND status != 'assigned_confirmed'
    ) INTO has_unconfirmed;

    -- Calculate send time: 18:00 in ward's timezone
    send_time := (next_sunday::text || ' 18:00:00')::timestamp
                 AT TIME ZONE COALESCE(ward.timezone, 'America/Sao_Paulo');

    -- Case 2: Unassigned -> Bishopric
    IF has_unassigned THEN
      INSERT INTO notification_queue (
        ward_id, type, sunday_date, target_role, status, send_after
      ) VALUES (
        ward.id,
        'weekly_assignment',
        next_sunday,
        'bishopric',
        'pending',
        send_time
      );
    END IF;

    -- Case 3: Unconfirmed -> Secretary
    IF has_unconfirmed THEN
      INSERT INTO notification_queue (
        ward_id, type, sunday_date, target_role, status, send_after
      ) VALUES (
        ward.id,
        'weekly_confirmation',
        next_sunday,
        'secretary',
        'pending',
        send_time
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule to run every Sunday at 12:00 UTC (before any ward's 18:00)
-- Note: In production, use pg_cron or Supabase scheduled function
-- SELECT cron.schedule('weekly-reminders', '0 12 * * 0', 'SELECT create_weekly_reminders()');
