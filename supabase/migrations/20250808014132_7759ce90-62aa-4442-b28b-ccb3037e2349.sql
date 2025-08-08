-- Create a secure function to invoke the process-matchday-results edge function
CREATE OR REPLACE FUNCTION public.invoke_matchday_results_processing()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  service_key text;
BEGIN
  -- Retrieve the service role key from Supabase Vault
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  
  -- Make the secure HTTP request to the process-matchday-results edge function
  RETURN net.http_post(
    url:='https://lhwnxgjdyahdkdjfeuhu.supabase.co/functions/v1/process-matchday-results',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body:='{"scheduled": true}'::jsonb
  );
END;
$$;

-- Schedule the function to run every Tuesday at 5:00 AM UTC
-- This assumes matches from the weekend are finished and results are available
SELECT cron.schedule(
  'process-matchday-results-weekly',
  '0 5 * * 2', -- Every Tuesday at 5:00 AM UTC
  $$
  SELECT public.invoke_matchday_results_processing();
  $$
);