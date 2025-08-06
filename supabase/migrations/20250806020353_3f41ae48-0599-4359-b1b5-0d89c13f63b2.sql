-- Drop the old invoke_update_odds_cache function if it still exists
DROP FUNCTION IF EXISTS public.invoke_update_odds_cache();

-- Unschedule any existing cron jobs for the old system
SELECT cron.unschedule('update-odds-cache-every-6-hours');
SELECT cron.unschedule('update-football-cache-every-6-hours');

-- Create the secure wrapper function that retrieves service role key from Vault
CREATE OR REPLACE FUNCTION public.invoke_football_cache_update()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  service_key text;
BEGIN
  -- Retrieve the service role key from Supabase Vault
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  
  -- Make the secure HTTP request to the update-football-cache edge function
  RETURN net.http_post(
    url:='https://lhwnxgjdyahdkdjfeuhu.supabase.co/functions/v1/update-football-cache',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body:='{"scheduled": true}'::jsonb
  );
END;
$function$;

-- Schedule the new secure cron job to run every 6 hours
SELECT cron.schedule(
  'update-football-cache-every-6-hours',
  '0 */6 * * *', -- Every 6 hours at minute 0
  $$
  SELECT public.invoke_football_cache_update();
  $$
);