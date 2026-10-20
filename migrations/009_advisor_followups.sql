-- Migration 009: follow-ups from the Supabase security advisors
REVOKE EXECUTE ON FUNCTION public.get_nearby_stations(double precision, double precision, double precision, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_nearby_stations(double precision, double precision, double precision, integer) TO authenticated;
ALTER VIEW public.current_fuel_prices SET (security_invoker = true);
ALTER FUNCTION public.stations_set_location() SET search_path = public, extensions;
