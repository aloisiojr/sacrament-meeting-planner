-- Migration 017: Split can_music into can_pianist and can_conductor
-- Feature: F117 (CR-180)
-- ADR-080: CHECK constraint ensures mutual exclusivity at DB level
--
-- This migration:
-- 1. Adds can_pianist and can_conductor boolean columns
-- 2. Migrates existing can_music=true data to can_pianist=true
-- 3. Drops the old can_music column
-- 4. Adds CHECK constraint to prevent both being true on same actor
--
-- Existing RLS policies on meeting_actors filter by ward_id only
-- and do NOT reference can_music, so no RLS changes are needed.
-- FK references (pianist_actor_id, conductor_actor_id) point to
-- meeting_actors.id and are unaffected by column changes.

-- Step 1: Add new boolean columns
ALTER TABLE meeting_actors
  ADD COLUMN can_pianist BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE meeting_actors
  ADD COLUMN can_conductor BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Migrate existing data - preserve music actors as pianists
UPDATE meeting_actors
  SET can_pianist = true
  WHERE can_music = true;

-- Step 3: Drop old column
ALTER TABLE meeting_actors
  DROP COLUMN can_music;

-- Step 4: Add mutual exclusivity constraint
ALTER TABLE meeting_actors
  ADD CONSTRAINT chk_pianist_conductor_exclusive
  CHECK (NOT (can_pianist = true AND can_conductor = true));
