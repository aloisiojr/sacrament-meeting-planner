-- Migration 027: Add partial index for speech count query (CR-258)
-- Covers: WHERE ward_id = ? AND position IN (1,2,3) AND member_id IS NOT NULL
--         AND sunday_date >= ? AND sunday_date <= ?
-- Used by: useSpeechCounts hook
CREATE INDEX idx_speeches_member_count
  ON speeches(ward_id, member_id, position, sunday_date)
  WHERE member_id IS NOT NULL;
