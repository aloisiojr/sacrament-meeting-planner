-- Migration 053: notification_queue honest delivery states (CONF-04).
-- NOT APPLIED anywhere by this change — apply only via the normal release process.
--
-- process-notifications used to mark every claimed entry 'sent' unconditionally, even when
-- the Expo push failed. This adds the states/columns the honest flow needs:
--   * 'processing' — claimed atomically by one cron run (WHERE status='pending'), so
--     concurrent crons cannot send the same entry twice;
--   * 'failed' — the push did not land; 'attempts' counts tries and 'last_error' says why.
-- Local type note (DEC-03 formal is wave 6): notification_queue.status stays TEXT+CHECK;
-- attempts/last_error are plain columns, no generated DB type is updated here.

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE public.notification_queue
  DROP CONSTRAINT IF EXISTS notification_queue_status_check;
ALTER TABLE public.notification_queue
  ADD CONSTRAINT notification_queue_status_check
  CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'));
