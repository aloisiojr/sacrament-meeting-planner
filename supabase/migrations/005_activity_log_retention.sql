-- 005_activity_log_retention.sql
-- Automatic removal of activity_log entries older than 2 years.
-- Runs as a PostgreSQL scheduled function (via pg_cron or Supabase cron).

-- Create the retention function
CREATE OR REPLACE FUNCTION delete_old_activity_log()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_log
  WHERE created_at < now() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule the function to run daily at 03:00 UTC
-- Note: Requires pg_cron extension (enabled in Supabase by default)
SELECT cron.schedule(
  'activity-log-retention',
  '0 3 * * *',  -- Daily at 03:00 UTC
  $$SELECT delete_old_activity_log()$$
);
