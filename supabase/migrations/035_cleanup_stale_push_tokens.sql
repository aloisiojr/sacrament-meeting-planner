-- Migration 035: Auto-cleanup stale push tokens on upsert
-- When a device registers a push token, delete any existing rows
-- with the same expo_push_token but different user_id.
-- This prevents a device from receiving notifications for a ward
-- the user is no longer logged into.

CREATE OR REPLACE FUNCTION cleanup_stale_push_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM device_push_tokens
  WHERE expo_push_token = NEW.expo_push_token
    AND user_id <> NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_stale_push_tokens
  BEFORE INSERT OR UPDATE ON device_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_stale_push_tokens();
