-- =============================================================================
-- Migration 021: Fix weekly reminders to respect manage_prayers setting
-- =============================================================================
-- When manage_prayers is OFF for a ward, prayer positions (0 and 4) should
-- be excluded from weekly reminder checks. Without this fix, wards with
-- manage_prayers=false could receive spurious weekly reminders triggered by
-- prayer-position speech rows.
-- This aligns create_weekly_reminders() with enqueue_speech_notification()
-- which already has this guard since migration 019.
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
  FOR ward IN SELECT w.id, w.timezone, w.manage_prayers FROM public.wards w LOOP
    -- Check if next sunday has a speech-blocking exception
    SELECT EXISTS (
      SELECT 1 FROM public.sunday_exceptions se
      WHERE se.ward_id = ward.id
        AND se.date = next_sunday
        AND se.reason IN ('general_conference', 'stake_conference')
    ) INTO has_exception;

    -- Skip if next sunday has a blocking exception
    IF has_exception THEN
      CONTINUE;
    END IF;

    -- Check for unassigned speeches (Case 2)
    -- Exclude prayer positions (0, 4) when manage_prayers is OFF
    SELECT EXISTS (
      SELECT 1 FROM public.speeches s
      WHERE s.ward_id = ward.id
        AND s.sunday_date = next_sunday
        AND s.status = 'not_assigned'
        AND (s.position NOT IN (0, 4) OR COALESCE(ward.manage_prayers, false))
    ) INTO has_unassigned;

    -- Check for unconfirmed speeches (Case 3)
    -- Exclude prayer positions (0, 4) when manage_prayers is OFF
    SELECT EXISTS (
      SELECT 1 FROM public.speeches s
      WHERE s.ward_id = ward.id
        AND s.sunday_date = next_sunday
        AND s.status != 'assigned_confirmed'
        AND (s.position NOT IN (0, 4) OR COALESCE(ward.manage_prayers, false))
    ) INTO has_unconfirmed;

    -- Calculate send time: 18:00 in ward's timezone
    send_time := (next_sunday::text || ' 18:00:00')::timestamp
                 AT TIME ZONE COALESCE(ward.timezone, 'America/Sao_Paulo');

    -- Case 2: Unassigned -> Bishopric
    IF has_unassigned THEN
      INSERT INTO public.notification_queue (
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
      INSERT INTO public.notification_queue (
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
$$ LANGUAGE plpgsql
SET search_path = '';
