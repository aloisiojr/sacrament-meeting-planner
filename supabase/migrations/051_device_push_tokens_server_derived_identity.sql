-- Migration 051: device_push_tokens identity (user_id / ward_id / role) is server-derived.
-- Fixes AUDIT CONF-05 (device_push_tokens part).
--
-- The 002 policies only tied the row to user_id = auth.uid(); ward_id and the role column
-- (added by 029, and the column process-notifications filters recipients by) came straight from
-- the client payload. An observer could register a token with role='bishopric' in any ward and
-- receive push notifications meant for the bishopric (e.g. speaker withdrawals).
--
-- Fix, in the existing shape of this table (035 already puts a BEFORE trigger on it):
--   * a BEFORE INSERT OR UPDATE trigger overwrites user_id/ward_id/role from the authenticated
--     caller's JWT whenever there is one (auth.uid() IS NOT NULL). service_role calls (Edge
--     Functions: push-update-nudge stamps, delete-user cleanup) have no user JWT and pass
--     through untouched — they are already the trusted side.
--   * INSERT/UPDATE policies additionally require ward_id = public.current_ward_id() as defense
--     in depth (WITH CHECK is evaluated after BEFORE triggers, so the legitimate client — which
--     already sends its own ward/role, src/hooks/useNotifications.ts — is unaffected, and the
--     notifications_enabled opt-out UPDATE keeps working: the trigger rewrites the same values).
--   * existing rows are backfilled from auth.users app_metadata, evicting any forged role/ward
--     already stored (data compatibility: rows survive, values become the true ones).
--
-- A caller whose JWT has no ward_id claim now fails closed: the trigger writes NULL into the
-- NOT NULL ward_id column and the insert is rejected.

-- =============================================================================
-- TRIGGER: derive identity from the JWT, never from the payload
-- =============================================================================
CREATE OR REPLACE FUNCTION public.derive_push_token_identity()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    NEW.ward_id := public.current_ward_id();
    NEW.role := public.current_user_role();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

DROP TRIGGER IF EXISTS trg_derive_push_token_identity ON device_push_tokens;
CREATE TRIGGER trg_derive_push_token_identity
  BEFORE INSERT OR UPDATE ON device_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.derive_push_token_identity();

-- =============================================================================
-- POLICIES: keep user-scoping, add own-ward on writes (defense in depth)
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert own push tokens" ON device_push_tokens;
CREATE POLICY "Users can insert own push tokens"
  ON device_push_tokens FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND ward_id = public.current_ward_id());

DROP POLICY IF EXISTS "Users can update own push tokens" ON device_push_tokens;
CREATE POLICY "Users can update own push tokens"
  ON device_push_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND ward_id = public.current_ward_id());

-- SELECT/DELETE stay purely user-scoped (unchanged from 002): a user reading or removing their
-- own token rows is harmless, and the opt-out read filters by user_id only.

-- =============================================================================
-- BACKFILL: stored role/ward become the user's real ones
-- =============================================================================
UPDATE public.device_push_tokens t
SET ward_id = (u.raw_app_meta_data->>'ward_id')::uuid,
    role = u.raw_app_meta_data->>'role'
FROM auth.users u
WHERE u.id = t.user_id
  AND u.raw_app_meta_data->>'ward_id' ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
