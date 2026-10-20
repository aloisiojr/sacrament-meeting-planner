-- Migration 054: speeches.assigned_by_role is server-derived (CONF-10).
-- NOT APPLIED anywhere by this change — apply only via the normal release process.
--
-- Migration 031 made the secretary-review notification trigger decide "a secretary
-- assigned this, warn the bishopric" from speeches.assigned_by_role — a column the
-- client writes freely. Forging 'secretary' fabricates a review; forging 'bishopric'
-- suppresses a real one.
--
-- Fix, in the same shape as 051 (device_push_tokens): a BEFORE INSERT OR UPDATE trigger
-- overwrites assigned_by_role with the caller's real role, public.current_user_role()
-- (049: JWT app_metadata.role, NULL when absent), whenever there is an authenticated
-- caller (auth.uid() IS NOT NULL). service_role writes (Edge Functions, no user JWT)
-- pass through untouched — they are already the trusted side.
--
-- Why overwrite instead of revoking the client's write on the column: clients in the
-- field already send assigned_by_role in every assignment payload (useSpeeches). A
-- REVOKE/column-privilege change would make those payloads error and break assignment
-- on shipped builds; overwriting keeps the payload valid and makes the forged value
-- inert. The 031 trigger then only ever reads a server-derived value.
-- Local type note (DEC-03 formal is wave 6): no new DB type; assigned_by_role stays TEXT.

CREATE OR REPLACE FUNCTION public.derive_assigned_by_role()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.assigned_by_role := public.current_user_role();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS trg_derive_assigned_by_role ON public.speeches;
CREATE TRIGGER trg_derive_assigned_by_role
  BEFORE INSERT OR UPDATE OF assigned_by_role ON public.speeches
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_assigned_by_role();
