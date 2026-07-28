-- Migration 036: app_config (version gate) + app-version tracking on push tokens (v1.x)
-- Additive only — safe for live v1.0 clients (new table + nullable columns; no drops/renames).

-- Global singleton config read by the `app-config` edge function / launch gate.
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  min_supported_version TEXT NOT NULL DEFAULT '1.0.0',
  latest_version TEXT NOT NULL DEFAULT '1.1.0',
  nudge_interval_days INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_config_singleton CHECK (id = 1)
);

INSERT INTO app_config (id, min_supported_version, latest_version, nudge_interval_days)
VALUES (1, '1.0.0', '1.1.0', 7)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read the global config; writes are service-role only (no write policy).
DROP POLICY IF EXISTS app_config_select ON app_config;
CREATE POLICY app_config_select ON app_config
  FOR SELECT TO authenticated USING (true);

-- Track app version + platform on push tokens so the nudge job can target outdated clients.
ALTER TABLE device_push_tokens ADD COLUMN IF NOT EXISTS app_version TEXT;
ALTER TABLE device_push_tokens ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE device_push_tokens ADD COLUMN IF NOT EXISTS last_update_nudge_at TIMESTAMPTZ;
