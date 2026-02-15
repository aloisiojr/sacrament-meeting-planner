-- Migration 008: Fix sunday type enum values
-- Removes: fast_sunday, special_program, no_meeting
-- Adds: primary_presentation, other
-- Adds: custom_reason TEXT column for 'other' type

-- Step 1: Add custom_reason column (nullable TEXT, for 'other' type)
ALTER TABLE sunday_exceptions
ADD COLUMN IF NOT EXISTS custom_reason TEXT;

-- Step 2: Preserve original reason as custom_reason BEFORE changing reason to 'other'
UPDATE sunday_exceptions
SET custom_reason = reason
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
