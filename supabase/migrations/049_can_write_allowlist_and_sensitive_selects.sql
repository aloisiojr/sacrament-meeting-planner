-- Migration 049: can_write() becomes an allowlist + sensitive SELECTs restricted to writers.
-- Fixes AUDIT CONF-01 (P0), CONF-05 (P1) and implements DEC-05 / DEC-04 (server side).
--
-- CONF-05 / DEC-05: public.can_write() (044) was a denylist — it blocked only the exact string
-- 'observer', so an empty, garbage or future forgotten role was a full writer (fail-open). It is
-- now an allowlist: only 'bishopric' and 'secretary' write. These two roles are DISTINCT in
-- app_metadata.role (DEC-04) but carry the same permissions; the client mirror is WRITER_ROLES in
-- src/lib/permissions.ts, and a concordance test asserts the two lists stay identical.
--
-- CONF-01: the SELECT policies on invitations and activity_log (002) required only same-ward, so
-- an observer could read pending invitation tokens — including a 'bishopric' one — and register
-- with the higher role; 044 hardened writes only ("SELECT policies are untouched"). No client
-- path reads the invitations table directly (create/accept go through service_role Edge
-- Functions), and useActivityLog already gates on history:read client-side, so restricting both
-- SELECTs to writers breaks no legitimate flow.
--
-- CONF-05 (SELECT side): remaining ward-scoped SELECT policies still used auth.ward_id(); they
-- move to public.current_ward_id() for the reason 044 gives — custom functions in the `auth`
-- schema can be wiped by Supabase auth-service upgrades, and current_ward_id() returns NULL
-- (deny) instead of the all-zeros sentinel when the claim is absent.
--
-- RLS/function tightening only — no new tables, columns or types. Idempotent: every policy is
-- dropped-if-exists and recreated. Tables dropped by 037/043 (meeting_actors,
-- ward_collection_config) are deliberately not touched.

-- =============================================================================
-- HELPERS: caller role + writer allowlist (the single SQL source for DEC-04/05)
-- =============================================================================
-- Role claim of the caller, mirroring public.current_ward_id(): NULL when the claim is absent,
-- so a missing role denies instead of matching anything.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE SQL STABLE
SET search_path = '';

-- Allowlist (DEC-05): writer roles are exactly bishopric + secretary. Observer, empty, garbage
-- and unknown roles are read-only. Client mirror: WRITER_ROLES in src/lib/permissions.ts.
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean AS $$
  SELECT COALESCE(public.current_user_role(), '') IN ('bishopric', 'secretary');
$$ LANGUAGE SQL STABLE
SET search_path = '';

-- =============================================================================
-- CONF-01: INVITATIONS — SELECT writers only (token must never reach an observer)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view ward invitations" ON invitations;
CREATE POLICY "Users can view ward invitations"
  ON invitations FOR SELECT TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- CONF-01: ACTIVITY LOG — SELECT writers only (mirrors client history:read gate)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view ward activity log" ON activity_log;
CREATE POLICY "Users can view ward activity log"
  ON activity_log FOR SELECT TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- CONF-05: remaining ward-scoped SELECTs move auth.ward_id() -> public.current_ward_id()
-- (read access itself is unchanged: every role of the ward still reads)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view their own ward" ON wards;
CREATE POLICY "Users can view their own ward"
  ON wards FOR SELECT TO authenticated
  USING (id = public.current_ward_id());

DROP POLICY IF EXISTS "Users can view ward members" ON members;
CREATE POLICY "Users can view ward members"
  ON members FOR SELECT TO authenticated
  USING (ward_id = public.current_ward_id());

DROP POLICY IF EXISTS "Users can view ward topics" ON ward_topics;
CREATE POLICY "Users can view ward topics"
  ON ward_topics FOR SELECT TO authenticated
  USING (ward_id = public.current_ward_id());

DROP POLICY IF EXISTS "Users can view sunday exceptions" ON sunday_exceptions;
CREATE POLICY "Users can view sunday exceptions"
  ON sunday_exceptions FOR SELECT TO authenticated
  USING (ward_id = public.current_ward_id());

DROP POLICY IF EXISTS "Users can view ward speeches" ON speeches;
CREATE POLICY "Users can view ward speeches"
  ON speeches FOR SELECT TO authenticated
  USING (ward_id = public.current_ward_id());

DROP POLICY IF EXISTS "Users can view ward agendas" ON sunday_agendas;
CREATE POLICY "Users can view ward agendas"
  ON sunday_agendas FOR SELECT TO authenticated
  USING (ward_id = public.current_ward_id());
