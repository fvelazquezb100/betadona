-- Fix the security issue by setting search_path for the function
CREATE OR REPLACE FUNCTION invoke_update_odds_cache()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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