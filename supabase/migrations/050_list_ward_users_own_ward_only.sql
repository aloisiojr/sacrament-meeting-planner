-- Migration 050: list_ward_users can only enumerate the caller's own ward.
-- Fixes AUDIT CONF-02 (P0).
--
-- The function (006, search_path-fixed in 015) is SECURITY DEFINER over auth.users and filtered
-- by the caller-supplied target_ward_id without ever checking the caller's ward — and no
-- migration ever revoked its default EXECUTE grant. Any authenticated user who learned another
-- ward's UUID could enumerate that ward's user ids, e-mails and roles via PostgREST RPC.
--
-- Legitimate callers are only the list-users / update-user-role / delete-user Edge Functions,
-- which call with the service_role key AFTER verifying the caller's JWT, ward and writer role
-- themselves — and always pass the caller's own ward. No client code calls this RPC directly
-- (grep-verified). So the guard can be strict without breaking the user-management screen:
--   * service_role callers pass (the Edge Function already authorized the human caller);
--   * direct authenticated callers must be writers (can_write, migration 049) asking for their
--     OWN ward — anything else returns zero rows;
--   * EXECUTE is revoked from public/anon and granted only to authenticated + service_role.
--
-- Signature and return shape are unchanged from 015. SECURITY DEFINER functions bypass RLS, so
-- this internal check IS the authorization (same pattern as import_members in 044).

CREATE OR REPLACE FUNCTION public.list_ward_users(target_ward_id uuid)
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
    AND (
      -- Edge Functions (service_role): they verified the caller's ward + writer role already.
      COALESCE(auth.jwt() ->> 'role', '') = 'service_role'
      -- Direct authenticated call: own ward only, writers only. Otherwise zero rows.
      OR (
        target_ward_id = public.current_ward_id()
        AND public.can_write()
      )
    )
  ORDER BY u.created_at ASC;
$$;

-- Default EXECUTE goes to PUBLIC on CREATE FUNCTION; lock it down explicitly (CONF-02).
REVOKE EXECUTE ON FUNCTION public.list_ward_users(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_ward_users(uuid) TO authenticated, service_role;
