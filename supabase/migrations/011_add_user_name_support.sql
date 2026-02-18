-- 011_add_user_name_support.sql
-- Add user_name column to activity_log and update list_ward_users RPC
-- to return full_name from app_metadata.
-- Part of CR-81: User Name Field feature.

-- 1. Add user_name column to activity_log (nullable, for new entries)
ALTER TABLE activity_log
ADD COLUMN user_name TEXT;

-- 2. Update list_ward_users RPC to return full_name from raw_app_meta_data
--    DROP first because return type changed (added full_name column)
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
