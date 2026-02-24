-- 020_split_speech_template.sql
-- CR-231: Split speech WhatsApp template into 3 individual templates
-- Replaces single wards.whatsapp_template with 3 per-position columns:
--   whatsapp_template_speech_1, whatsapp_template_speech_2, whatsapp_template_speech_3
-- Each column stores the template for that speech position.
-- Existing data is copied to all 3 new columns before dropping the old column.
--
-- CRITICAL ORDER: add columns, copy data, THEN drop old column.

-- =============================================================================
-- Step 1: Add 3 new speech template columns
-- =============================================================================
ALTER TABLE public.wards
  ADD COLUMN whatsapp_template_speech_1 TEXT,
  ADD COLUMN whatsapp_template_speech_2 TEXT,
  ADD COLUMN whatsapp_template_speech_3 TEXT;

-- =============================================================================
-- Step 2: Copy existing whatsapp_template value to all 3 new columns
-- =============================================================================
UPDATE public.wards
SET
  whatsapp_template_speech_1 = whatsapp_template,
  whatsapp_template_speech_2 = whatsapp_template,
  whatsapp_template_speech_3 = whatsapp_template;

-- =============================================================================
-- Step 3: Drop the old whatsapp_template column
-- =============================================================================
ALTER TABLE public.wards DROP COLUMN whatsapp_template;
