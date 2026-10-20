-- Migration 008: shared secret for the notify-favorites DB webhook
-- The secret is generated inside the database and never leaves it (not in this repo).
-- Safe to run multiple times (rotates the secret and recreates the trigger).

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated, public;

CREATE TABLE IF NOT EXISTS private.webhook_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL
);
REVOKE ALL ON private.webhook_secrets FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.check_webhook_secret(p_name text, p_secret text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM private.webhook_secrets w WHERE w.name = p_name AND w.secret = p_secret);
$$;
REVOKE EXECUTE ON FUNCTION public.check_webhook_secret(text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.check_webhook_secret(text, text) TO service_role;

DO $$
DECLARE
  s text := encode(gen_random_bytes(32), 'hex');
BEGIN
  INSERT INTO private.webhook_secrets (name, secret) VALUES ('notify-favorites', s)
    ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

  DROP TRIGGER IF EXISTS "notify-favorites" ON public.fuel_prices;
  EXECUTE format(
    'CREATE TRIGGER "notify-favorites" AFTER INSERT OR UPDATE ON public.fuel_prices FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    'https://zyeynfmjzgmdmhljvvcg.supabase.co/functions/v1/notify-favorites',
    'POST',
    json_build_object('Content-type', 'application/json', 'x-webhook-secret', s)::text,
    '{}',
    '5000'
  );
END $$;
