-- Migration 014: Add speaker override fields for last-minute swap (CR-100/F044)
ALTER TABLE sunday_agendas
  ADD COLUMN speaker_1_override TEXT DEFAULT NULL,
  ADD COLUMN speaker_2_override TEXT DEFAULT NULL,
  ADD COLUMN speaker_3_override TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN sunday_agendas.speaker_1_override IS 'Override name for 1st speaker (last-minute swap). NULL = use speeches.speaker_name';
COMMENT ON COLUMN sunday_agendas.speaker_2_override IS 'Override name for 2nd speaker (last-minute swap). NULL = use speeches.speaker_name';
COMMENT ON COLUMN sunday_agendas.speaker_3_override IS 'Override name for 3rd speaker (last-minute swap). NULL = use speeches.speaker_name';
