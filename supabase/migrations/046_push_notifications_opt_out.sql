-- Migration 046: per-user push notification opt-out (P2 feature gap D).
--
-- Adds a master opt-out that the sender (process-notifications) respects. Stored on the device
-- token row so the send-side can filter with a single predicate; the settings UI toggles all of a
-- user's tokens. Defaults to true (opted in) — existing tokens keep receiving, so this is
-- backward-compatible for shipped app versions (old clients simply never toggle it off).

ALTER TABLE device_push_tokens
  ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;

-- Partial index to keep the sender's "opted-in tokens for a ward+role" query fast.
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_enabled
  ON device_push_tokens (ward_id)
  WHERE notifications_enabled = true;
