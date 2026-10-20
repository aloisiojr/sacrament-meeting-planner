-- Migration 056: realtime publication tells the truth (CONF-15 + CONF-09 server side).
-- NOT APPLIED anywhere by this change — apply only via the normal release process.
--
-- Migration 010 put ward_collection_config and meeting_actors in the supabase_realtime
-- publication; both tables were dropped (043 and 037 respectively), leaving dead
-- publication entries. wards (ward language/timezone/name) and activity_log (history)
-- were never published, so other devices never saw those changes live.
--
-- The DROP is guarded: in an environment where the dead entries were already removed
-- by hand, ALTER PUBLICATION ... DROP TABLE would error and abort the migration.
-- ADD is plain: neither table is in the publication today (010 is the only publication
-- migration), so a duplicate-add error would mean the environment diverged and should
-- be looked at, not silently absorbed.
--
-- Also records, on the catalog policies themselves, that USING (true) is INTENTIONAL:
-- general_collections, general_topics and hymns are global read-only catalogs (no ward
-- data, no writes for authenticated users). Do not "fix" them into ward-scoping.
-- (ward_collection_config's policy is gone with its table since 043.)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ward_collection_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE ward_collection_config;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meeting_actors'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE meeting_actors;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE wards;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

COMMENT ON POLICY "Authenticated users can view general collections" ON general_collections
  IS 'INTENTIONAL USING(true): global read-only catalog, no ward data. Do not ward-scope.';
COMMENT ON POLICY "Authenticated users can view general topics" ON general_topics
  IS 'INTENTIONAL USING(true): global read-only catalog, no ward data. Do not ward-scope.';
COMMENT ON POLICY "Authenticated users can view hymns" ON hymns
  IS 'INTENTIONAL USING(true): global read-only catalog, no ward data. Do not ward-scope.';
