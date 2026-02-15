-- Migration 008: Fix sunday type enum values
-- Removes: fast_sunday, special_program, no_meeting
-- Adds: primary_presentation, other
-- Adds: custom_reason TEXT column for 'other' type

-- Step 1: Add custom_reason column (nullable TEXT, for 'other' type)
ALTER TABLE sunday_exceptions
ADD COLUMN IF NOT EXISTS custom_reason TEXT;

-- Step 2: Preserve original reason as human-readable custom_reason BEFORE changing reason
UPDATE sunday_exceptions
SET custom_reason = CASE reason
  WHEN 'fast_sunday' THEN 'Domingo de Jejum'
  WHEN 'special_program' THEN 'Programa Especial'
  WHEN 'no_meeting' THEN 'Sem Reunião'
END
WHERE reason IN ('fast_sunday', 'special_program', 'no_meeting');

-- Step 3: Migrate removed enum values to 'other'
UPDATE sunday_exceptions
SET reason = 'other'
WHERE reason IN ('fast_sunday', 'special_program', 'no_meeting');

-- Step 4: Drop the old CHECK constraint
ALTER TABLE sunday_exceptions
DROP CONSTRAINT IF EXISTS sunday_exceptions_reason_check;

-- Step 5: Add the corrected CHECK constraint
ALTER TABLE sunday_exceptions
ADD CONSTRAINT sunday_exceptions_reason_check
CHECK (reason IN (
  'testimony_meeting',
  'general_conference',
  'stake_conference',
  'ward_conference',
  'primary_presentation',
  'other'
));
