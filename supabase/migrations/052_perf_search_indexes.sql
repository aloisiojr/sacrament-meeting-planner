-- Migration 052: search/lookup indexes for the perf wave (AUDIT RAP-10 + RAP-14).
--
-- activity_log search (useActivityLog) runs `ilike '%term%'` over user_email,
-- user_name and description inside a ward. Without pg_trgm those are sequential
-- scans over a table that only grows (retention aside). Trigram GIN indexes make
-- the substring search index-backed; the ward+created_at index (001) already
-- covers ordering, and date searches now use a created_at range in the client
-- instead of a `created_at::text` ilike cast, so no trigram index is needed there.
--
-- Plain FK/lookup indexes that were missing:
--   * members(responsible_id)      — "responsible for" lookups (037 added the column)
--   * general_collections(language) — topic library load filters by language
--   * speeches(member_id)          — per-member speech history/counts join on it
--
-- NOT APPLIED by this change (dev-flow: migrations are applied by the owner at
-- the cutover, never from a worktree).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_activity_log_user_email_trgm
  ON activity_log USING gin (user_email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_name_trgm
  ON activity_log USING gin (user_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_activity_log_description_trgm
  ON activity_log USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_members_responsible_id
  ON members(responsible_id);
CREATE INDEX IF NOT EXISTS idx_general_collections_language
  ON general_collections(language);
CREATE INDEX IF NOT EXISTS idx_speeches_member_id
  ON speeches(member_id);
