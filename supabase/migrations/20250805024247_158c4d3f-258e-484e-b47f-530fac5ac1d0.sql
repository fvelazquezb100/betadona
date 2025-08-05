-- First, create a secure function to call your Edge Function
-- This function safely retrieves your secret key from the Vault.
CREATE OR REPLACE FUNCTION invoke_update_odds_cache()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  service_key text;
BEGIN
  -- Retrieve the secret from the Vault
  SELECT decrypted_secret INTO service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Make the HTTP request using the secure service_role key
  RETURN net.http_post(
      url:='https://lhwnxgjdyahdkdjfeuhu.supabase.co/functions/v1/update-odds-cache',
      headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
      ),
      body:='{"scheduled": true}'::jsonb
  );
END;
$$;

-- Now, schedule THIS secure function to run every 6 hours
-- This avoids exposing any keys in the cron job itself.
SELECT cron.schedule(
  'update-odds-cache-every-6-hours',
  '0 */6 * * *', -- every 6 hours
  'SELECT invoke_update_odds_cache();'
);