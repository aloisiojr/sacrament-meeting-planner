-- Migration 045: auto-revoke expired invitations (P2 feature gap C).
--
-- The 30-day invitation timeout already works (create-invitation sets expires_at = now + 30 days;
-- register-invited-user rejects token_expired / token_used). This adds the "automatic revoke" half:
-- a global sweep that removes unused invitations whose window has passed, so dead tokens don't
-- linger in the table. create-invitation also lazily revokes a ward's expired invites on each new
-- invite; this scheduled sweep covers wards that create no further invitations.
--
-- Safe for coexisting app versions: expired unused invitations are already unusable, so deleting
-- them changes no client behavior. No schema change, no data migration.

-- Cleanup function: delete unused, expired invitations. Returns the number removed.
CREATE OR REPLACE FUNCTION public.revoke_expired_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.invitations
  WHERE used_at IS NULL
    AND expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule a daily sweep when pg_cron is available. If pg_cron is not installed on this project,
-- the function still exists and can be scheduled from the Supabase dashboard (same pattern as
-- process-notifications). Guarded so the migration succeeds either way, and idempotent on re-run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('revoke-expired-invitations')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'revoke-expired-invitations'
    );
    PERFORM cron.schedule(
      'revoke-expired-invitations',
      '0 3 * * *',
      $cron$SELECT public.revoke_expired_invitations();$cron$
    );
  END IF;
END $$;
