-- Migration 007: Security hardening before Play Store release
-- Safe to run multiple times

-- ============================================
-- 1. users: restrict columns clients can update, hide push tokens
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- Only these columns are writable by clients (reputation, access_remaining, is_admin are not)
REVOKE UPDATE ON public.users FROM anon, authenticated;
GRANT UPDATE (display_name, preferred_fuel, expo_push_token) ON public.users TO authenticated;

-- Clients may only insert identity columns; reputation/access/is_admin use column defaults
ALTER TABLE public.users ALTER COLUMN reputation SET DEFAULT 0;
ALTER TABLE public.users ALTER COLUMN access_remaining SET DEFAULT 3;
REVOKE INSERT ON public.users FROM anon, authenticated;
GRANT INSERT (auth_id, display_name) ON public.users TO authenticated;

-- Public leaderboard: no tokens, no auth ids
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, display_name, reputation FROM public.users;
REVOKE ALL ON public.public_profiles FROM anon, authenticated, public;
GRANT SELECT ON public.public_profiles TO authenticated;

-- ============================================
-- 2. Admin helper + admin-only report moderation
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT u.is_admin FROM public.users u WHERE u.auth_id = auth.uid()), false);
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.reports SET status = 'validated' WHERE id = report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_report(report_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.reports SET status = 'rejected' WHERE id = report_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_report(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_report(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_report(UUID) TO authenticated;

DROP POLICY IF EXISTS "reports_update_admin" ON public.reports;
CREATE POLICY "reports_update_admin" ON public.reports
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================
-- 4. Access credits: enforce on the server
-- ============================================
DROP FUNCTION IF EXISTS public.grant_access(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.consume_access(UUID);
CREATE FUNCTION public.consume_access(user_auth_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  remaining integer;
BEGIN
  IF user_auth_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.users
     SET access_remaining = access_remaining - 1
   WHERE auth_id = user_auth_id AND access_remaining > 0
   RETURNING access_remaining INTO remaining;
  IF remaining IS NULL THEN
    SELECT access_remaining INTO remaining FROM public.users WHERE auth_id = user_auth_id;
  ELSE
    INSERT INTO public.access_logs (user_id, action)
    SELECT id, 'consume_access' FROM public.users WHERE auth_id = user_auth_id;
  END IF;
  RETURN COALESCE(remaining, 0);
END;
$$;

-- Credits for reports are granted by a trigger, never by the client
DROP FUNCTION IF EXISTS public.grant_access(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.trg_grant_report_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.users SET access_remaining = access_remaining + 2 WHERE id = NEW.user_id;
  INSERT INTO public.access_logs (user_id, action) VALUES (NEW.user_id, 'grant_access: valid_report');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.trg_grant_report_access() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS grant_report_access ON public.reports;
CREATE TRIGGER grant_report_access
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_grant_report_access();

REVOKE EXECUTE ON FUNCTION public.consume_access(UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_access(UUID) TO authenticated;

-- ============================================
-- 4b. Report / price integrity, leftover open functions, trust score
-- ============================================
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (status = 'pending' AND user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- No direct client inserts: prices come from approved reports (trigger), stations via ensure_station()
DROP POLICY IF EXISTS "fuel_prices_insert" ON public.fuel_prices;
DROP POLICY IF EXISTS "stations_insert" ON public.stations;

REVOKE EXECUTE ON FUNCTION public.trg_approve_report() FROM anon, authenticated, public;
ALTER FUNCTION public.trg_approve_report() SET search_path = public;
DROP FUNCTION IF EXISTS public.get_cheapest_station(double precision, double precision);

DROP FUNCTION IF EXISTS public.upsert_user_profile(UUID, TEXT, INTEGER, INTEGER);

-- get_nearby_stations joins users (reputation); run it with owner rights now that users is row-restricted
ALTER FUNCTION public.get_nearby_stations(double precision, double precision, double precision, integer)
  SECURITY DEFINER SET search_path = public, extensions;

ALTER FUNCTION public.ensure_station(text, text, double precision, double precision, text, text, text, text)
  SET search_path = public, extensions;
REVOKE EXECUTE ON FUNCTION public.ensure_station(text, text, double precision, double precision, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.ensure_station(text, text, double precision, double precision, text, text, text, text) TO authenticated;

-- ============================================
-- 5. favorites: user_id references users.id (not auth.uid()), so policies must map through users
-- ============================================
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_own" ON public.favorites;
CREATE POLICY "favorites_own" ON public.favorites
  FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorites_user_station_key') THEN
    ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_station_key UNIQUE (user_id, station_id);
  END IF;
END $$;

-- Photo bucket: only small images
UPDATE storage.buckets
   SET file_size_limit = 5242880, allowed_mime_types = ARRAY['image/jpeg','image/png']
 WHERE id = 'reports';

-- ============================================
-- 6. Account deletion (required by Play Store)
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  pid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO pid FROM public.users WHERE auth_id = auth.uid();
  IF pid IS NOT NULL THEN
    -- Best effort: tables whose schema lives only in the dashboard
    BEGIN DELETE FROM storage.objects WHERE bucket_id = 'reports' AND name LIKE pid::text || '\_%'; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.favorites WHERE user_id = pid; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.reports WHERE user_id = pid; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.access_logs WHERE user_id = pid; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DELETE FROM public.reputation_events WHERE user_id = pid; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN UPDATE public.fuel_prices SET created_by = NULL WHERE created_by = pid; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  DELETE FROM public.users WHERE auth_id = auth.uid();
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
