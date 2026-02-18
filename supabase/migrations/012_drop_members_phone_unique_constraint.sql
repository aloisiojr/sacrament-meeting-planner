-- Migration: Drop unique constraint on (ward_id, country_code, phone)
-- Reason: Duplicate phone numbers are valid in real ward data (family members
-- sharing the same phone). The constraint was blocking CSV imports with duplicates.
-- CR-78 relaxed the app-level validation but this DB constraint remained.

ALTER TABLE members DROP CONSTRAINT IF EXISTS members_ward_id_country_code_phone_key;
