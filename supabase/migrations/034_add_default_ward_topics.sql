-- Migration 034: Add is_default column to ward_topics and seed default topics
-- for existing wards based on their language setting.

-- Step 1: Add column
ALTER TABLE ward_topics ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Insert defaults for existing wards (pt-BR)
INSERT INTO ward_topics (ward_id, title, is_default)
SELECT w.id, t.title, true
FROM wards w
CROSS JOIN (VALUES ('Tema livre'), ('Seu testemunho')) AS t(title)
WHERE w.language = 'pt-BR'
  AND NOT EXISTS (
    SELECT 1 FROM ward_topics wt
    WHERE wt.ward_id = w.id AND wt.title = t.title
  );

-- Step 2b: Insert defaults for existing wards (en-US)
INSERT INTO ward_topics (ward_id, title, is_default)
SELECT w.id, t.title, true
FROM wards w
CROSS JOIN (VALUES ('Open Topic'), ('Your Testimony')) AS t(title)
WHERE w.language = 'en-US'
  AND NOT EXISTS (
    SELECT 1 FROM ward_topics wt
    WHERE wt.ward_id = w.id AND wt.title = t.title
  );

-- Step 2c: Insert defaults for existing wards (es-LA)
INSERT INTO ward_topics (ward_id, title, is_default)
SELECT w.id, t.title, true
FROM wards w
CROSS JOIN (VALUES ('Tema libre'), ('Tu testimonio')) AS t(title)
WHERE w.language = 'es-LA'
  AND NOT EXISTS (
    SELECT 1 FROM ward_topics wt
    WHERE wt.ward_id = w.id AND wt.title = t.title
  );
