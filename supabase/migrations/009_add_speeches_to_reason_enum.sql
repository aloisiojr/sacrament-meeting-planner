-- Migration 009: Add 'speeches' to sunday_exceptions reason enum
-- CR-56: Speeches must be persisted in the DB like any other sunday type
-- CR-68: Fixes race condition where missing DB row caused optimistic update revert

-- Step 1: Drop the old CHECK constraint
ALTER TABLE sunday_exceptions
DROP CONSTRAINT IF EXISTS sunday_exceptions_reason_check;

-- Step 2: Add new CHECK constraint including 'speeches'
ALTER TABLE sunday_exceptions
ADD CONSTRAINT sunday_exceptions_reason_check
CHECK (reason IN (
  'speeches',
  'testimony_meeting',
  'general_conference',
  'stake_conference',
  'ward_conference',
  'primary_presentation',
  'other'
));

-- Step 3: Backfill speeches entries for all sundays in each ward's date range
-- For each ward, generate sundays from 6 months ago to 12 months ahead,
-- and insert 'speeches' for any sunday that doesn't already have an entry.
INSERT INTO sunday_exceptions (ward_id, date, reason)
SELECT w.id, d.sunday_date, 'speeches'
FROM wards w
CROSS JOIN LATERAL (
  SELECT generate_series(
    -- Start: most recent Sunday on or before 6 months ago
    date_trunc('week', NOW() - INTERVAL '6 months') + INTERVAL '6 days'
      - CASE WHEN EXTRACT(DOW FROM date_trunc('week', NOW() - INTERVAL '6 months') + INTERVAL '6 days') = 0
             THEN INTERVAL '0 days'
             ELSE INTERVAL '7 days' END,
    -- End: 12 months from now
    NOW() + INTERVAL '12 months',
    INTERVAL '7 days'
  )::date AS sunday_date
) d
WHERE EXTRACT(DOW FROM d.sunday_date) = 0  -- Only Sundays
  AND NOT EXISTS (
    SELECT 1 FROM sunday_exceptions se
    WHERE se.ward_id = w.id AND se.date = d.sunday_date
  )
ON CONFLICT DO NOTHING;
