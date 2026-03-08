-- Migration 032: Convert recognized_names from TEXT[] to TEXT
-- recognized_names now uses \n-joined TEXT format (consistent with announcements, etc.)

-- Step 1: Add temporary column
ALTER TABLE sunday_agendas ADD COLUMN recognized_names_new TEXT;

-- Step 2: Migrate data (array -> \n-joined string)
UPDATE sunday_agendas
SET recognized_names_new = array_to_string(recognized_names, E'\n')
WHERE recognized_names IS NOT NULL
  AND array_length(recognized_names, 1) > 0;

-- Step 3: Drop old column and rename new
ALTER TABLE sunday_agendas DROP COLUMN recognized_names;
ALTER TABLE sunday_agendas RENAME COLUMN recognized_names_new TO recognized_names;
