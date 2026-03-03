-- Migration 025: Actor Single Role Enum (CR-255)
-- Replaces 5 boolean flags with a single TEXT role column.
-- Priority order for multi-flag actors: preside > conduct > recognize > pianist > conductor

-- Step 1: Add role column with default
ALTER TABLE meeting_actors ADD COLUMN role TEXT NOT NULL DEFAULT 'preside';

-- Step 2: Migrate data from boolean flags to role enum
UPDATE meeting_actors SET role = CASE
  WHEN can_preside = true THEN 'preside'
  WHEN can_conduct = true THEN 'conduct'
  WHEN can_recognize = true THEN 'recognize'
  WHEN can_pianist = true THEN 'pianist'
  WHEN can_conductor = true THEN 'conductor'
  ELSE 'preside'
END;

-- Step 3: Drop boolean columns
ALTER TABLE meeting_actors
  DROP COLUMN can_preside,
  DROP COLUMN can_conduct,
  DROP COLUMN can_recognize,
  DROP COLUMN can_pianist,
  DROP COLUMN can_conductor;

-- Step 4: Drop old constraint
ALTER TABLE meeting_actors DROP CONSTRAINT IF EXISTS chk_pianist_conductor_exclusive;

-- Step 5: Add new CHECK constraint
ALTER TABLE meeting_actors ADD CONSTRAINT chk_actor_role
  CHECK (role IN ('preside', 'conduct', 'recognize', 'pianist', 'conductor'));
