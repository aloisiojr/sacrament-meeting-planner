-- Migration 010: Enable Realtime publication for synced tables
-- Fix: The Realtime subscription in useRealtimeSync.ts listens for
-- postgres_changes events, but the tables were never added to the
-- supabase_realtime publication. Without this, no change events are
-- emitted and the client falls back to polling every 2.5s.

-- Add all ward-scoped synced tables to the Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE ward_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE ward_collection_config;
ALTER PUBLICATION supabase_realtime ADD TABLE sunday_exceptions;
ALTER PUBLICATION supabase_realtime ADD TABLE speeches;
ALTER PUBLICATION supabase_realtime ADD TABLE sunday_agendas;
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_actors;
