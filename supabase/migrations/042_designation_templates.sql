-- Migration 042: per-ward designation read-text template overrides (v2.0). See ADR 003.
-- ADDITIVE ONLY — safe for live v1.0 clients: adds nullable TEXT columns that older clients
-- ignore. NULL/blank => the built-in localized default. Mirrors the whatsapp_template_* pattern.

ALTER TABLE wards ADD COLUMN IF NOT EXISTS designation_template_sustain TEXT;
ALTER TABLE wards ADD COLUMN IF NOT EXISTS designation_template_release TEXT;
ALTER TABLE wards ADD COLUMN IF NOT EXISTS designation_template_priesthood TEXT;
ALTER TABLE wards ADD COLUMN IF NOT EXISTS designation_template_new_member TEXT;
