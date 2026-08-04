-- Migration 047: finish what 044 started — require can_write() on the activity_log INSERT policy.
--
-- Migration 044 states it "requires [can_write()] on every ward-scoped write policy". It missed
-- this one. Verified against staging (all 46 migrations applied): 22 live write policies, 18 carry
-- can_write(), and the four that do not are this one plus the three device_push_tokens policies —
-- which are correctly scoped to the caller's own row (user_id = auth.uid()) and are left alone.
--
-- Impact: activity_log is the audit trail. An `observer` — who cannot even READ it (no
-- history:read) — could INSERT forged entries for their own ward through a direct PostgREST call.
-- Nothing in the app does this; the hole is only reachable by a hand-made request, which is
-- precisely the threat model 044 exists for.
--
-- Also switches auth.ward_id() to public.current_ward_id(), for the reason 044 gives: custom
-- functions in the `auth` schema can be wiped by Supabase auth-service upgrades, and
-- current_ward_id() returns NULL rather than a sentinel when the claim is absent, so a missing
-- claim denies the write instead of matching some ward.
--
-- No new tables, columns or types: RLS tightening only. Safe to apply at any time — it is not part
-- of the v2 breaking set, because the only callers it can affect are direct API calls by observers.

-- =============================================================================
-- ACTIVITY LOG (INSERT) — append-only audit trail, writers only
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert ward activity log" ON activity_log;
CREATE POLICY "Users can insert ward activity log"
  ON activity_log FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

-- No UPDATE or DELETE policies on activity_log, by design: an audit trail that can be rewritten is
-- not an audit trail. This migration deliberately does not add any.
