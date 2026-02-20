-- 015_fix_function_search_path.sql
-- Fix mutable search_path in 7 PostgreSQL functions (F087 / CR-144).
-- Adds SET search_path = '' to all functions and qualifies table references
-- with explicit schema (public.*, auth.*).

-- =============================================================================
-- 1. update_updated_at_column (from 001_initial_schema.sql)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =============================================================================
-- 2. auth.ward_id (from 002_rls_policies.sql)
-- =============================================================================
CREATE OR REPLACE FUNCTION auth.ward_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'ward_id')::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
$$ LANGUAGE SQL STABLE
SET search_path = '';

-- =============================================================================
-- 3. list_ward_users (from 011_add_user_name_support.sql)
-- =============================================================================
DROP FUNCTION IF EXISTS list_ward_users(uuid);
CREATE OR REPLACE FUNCTION list_ward_users(target_ward_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  full_name text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_app_meta_data->>'role', 'observer') AS role,
    COALESCE(u.raw_app_meta_data->>'full_name', '') AS full_name,
    u.created_at
  FROM auth.users u
  WHERE u.raw_app_meta_data->>'ward_id' = target_ward_id::text
  ORDER BY u.created_at ASC;
$$;

-- =============================================================================
-- 4. create_weekly_reminders (from 004_weekly_reminder_function.sql)
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
  FOR ward IN SELECT w.id, w.timezone FROM public.wards w LOOP
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
    SELECT EXISTS (
      SELECT 1 FROM public.speeches s
      WHERE s.ward_id = ward.id
        AND s.sunday_date = next_sunday
        AND s.status = 'not_assigned'
    ) INTO has_unassigned;

    -- Check for unconfirmed speeches (Case 3)
    SELECT EXISTS (
      SELECT 1 FROM public.speeches s
      WHERE s.ward_id = ward.id
        AND s.sunday_date = next_sunday
        AND s.status != 'assigned_confirmed'
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

-- =============================================================================
-- 5. enqueue_speech_notification (from 013, originally 003)
-- =============================================================================
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

-- =============================================================================
-- 6. delete_old_activity_log (from 005_activity_log_retention.sql)
-- =============================================================================
CREATE OR REPLACE FUNCTION delete_old_activity_log()
RETURNS void AS $$
BEGIN
  DELETE FROM public.activity_log
  WHERE created_at < now() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =============================================================================
-- 7. import_members (from 007_import_members_rpc.sql)
-- =============================================================================
CREATE OR REPLACE FUNCTION import_members(
  target_ward_id uuid,
  new_members jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  member_count integer;
BEGIN
  -- Delete all existing members for this ward
  DELETE FROM public.members WHERE ward_id = target_ward_id;

  -- Insert new members from JSONB array
  INSERT INTO public.members (ward_id, full_name, country_code, phone)
  SELECT
    target_ward_id,
    (m->>'full_name')::text,
    (m->>'country_code')::text,
    NULLIF((m->>'phone')::text, '')
  FROM jsonb_array_elements(new_members) AS m;

  GET DIAGNOSTICS member_count = ROW_COUNT;
  RETURN member_count;
END;
$$;
