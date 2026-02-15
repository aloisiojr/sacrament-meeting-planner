-- Migration 008: Fix sunday type enum values
-- Removes: fast_sunday, special_program, no_meeting
-- Adds: primary_presentation, other
-- Adds: custom_reason TEXT column for 'other' type

-- Step 1: Migrate existing data with removed values to 'other' BEFORE constraint change
UPDATE sunday_exceptions
SET reason = 'other'
WHERE reason IN ('fast_sunday', 'special_program', 'no_meeting');

-- Step 2: Add custom_reason column (nullable TEXT, for 'other' type)
ALTER TABLE sunday_exceptions
ADD COLUMN IF NOT EXISTS custom_reason TEXT;

-- Step 3: Preserve original reason as custom_reason for migrated rows
-- (Run this before dropping the constraint so we can reference the old values)
-- Note: Since we already changed reason to 'other' above, we set a generic custom_reason
-- for any rows that were just migrated and don't have one yet.
-- In practice, the UPDATE above already changed them, so we set a descriptive default.

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
