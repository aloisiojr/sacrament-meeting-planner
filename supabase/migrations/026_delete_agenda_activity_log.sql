-- Migration 026: Delete agenda-related activity log entries (CR-260)
-- Removes all existing activity_log entries with agenda-related action types.
-- This is a data-only migration (DELETE, no schema changes).
-- Safe on empty tables (DELETE affects 0 rows, no error).

DELETE FROM activity_log
WHERE action_type IN (
  'agenda:edit',
  'agenda_last_minute_speech',
  'agenda_last_minute_speech_removed'
);
