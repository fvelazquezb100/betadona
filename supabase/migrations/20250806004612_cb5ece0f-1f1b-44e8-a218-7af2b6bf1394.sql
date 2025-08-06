-- Remove the old cron job
SELECT cron.unschedule('update-odds-cache-every-6-hours');