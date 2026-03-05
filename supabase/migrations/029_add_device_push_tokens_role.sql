-- Migration 029: Add role column to device_push_tokens (CR-273, ADR-030)
-- Stores user role to enable filtering by role in SQL queries,
-- eliminating N+1 getUserById calls in process-notifications.
-- Nullable: existing rows will have NULL until user next opens the app.

ALTER TABLE device_push_tokens ADD COLUMN role TEXT;
