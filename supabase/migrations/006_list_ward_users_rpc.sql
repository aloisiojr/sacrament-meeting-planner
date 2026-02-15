-- 006_list_ward_users_rpc.sql
-- RPC function to list users in a specific ward efficiently.
-- Queries auth.users directly with a WHERE clause instead of scanning all users.
-- Callable only with service_role key from Edge Functions.

CREATE OR REPLACE FUNCTION list_ward_users(target_ward_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
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
    u.created_at
  FROM auth.users u
  WHERE u.raw_app_meta_data->>'ward_id' = target_ward_id::text
  ORDER BY u.created_at ASC;
$$;
