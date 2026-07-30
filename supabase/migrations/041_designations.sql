-- Migration 041: structured supports/releases on sunday_agendas (v2.0). See ADR 002.
-- BREAKING — governed by the ADR 001 forced-update cutover (no v1 coexistence): replaces the
-- free-text `sustaining_releasing` column with a structured `designations` JSONB list. Apply at
-- the v2 cutover, AFTER a DB backup and after the min-version gate is raised. Existing free-text
-- supports/releases are NOT migrated (clean cutover, accepted by the product owner).
--
-- `designations` is an ordered array of:
--   { "type": "sustain"|"release"|"priesthood"|"new_member",
--     "person_name": string, "member_id": uuid|null,
--     "calling": string|null, "office": "deacon"|"teacher"|"priest"|null }
-- All human-readable values are plain-text SNAPSHOTS, never foreign keys.

ALTER TABLE sunday_agendas ADD COLUMN IF NOT EXISTS designations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sunday_agendas DROP COLUMN IF EXISTS sustaining_releasing;
