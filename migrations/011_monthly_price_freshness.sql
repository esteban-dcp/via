-- Migration 011: freshness based on Ecuador's monthly fuel price cycle (changes on the 12th).
-- 'fresh'  = reported on the cycle start day (the 12th)  -> UI "Súper fresco"
-- 'recent' = reported after the 12th of the current cycle -> UI "Precio actualizado"
-- 'stale'  = reported before the current cycle started    -> UI "Desactualizado"
-- Same signature as before, so CREATE OR REPLACE is enough.

CREATE OR REPLACE FUNCTION public.get_nearby_stations(
  user_lat double precision,
  user_lng double precision,
  radius_meters double precision DEFAULT 10000,
  limit_count integer DEFAULT 50
)
RETURNS TABLE(station_id uuid, station_name text, latitude double precision, longitude double precision, distance_meters double precision, price numeric, fuel_type text, freshness text, trust_score integer, brand text, city text, province text, price_date timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_now_ec timestamp := now() at time zone 'America/Guayaquil';
  v_cycle_start timestamp;
begin
  v_cycle_start := date_trunc('month', v_now_ec) + interval '11 days';
  if v_now_ec < v_cycle_start then
    v_cycle_start := v_cycle_start - interval '1 month';
  end if;

  return query
  with nearby as (
    select
      s.id,
      s.name,
      s.latitude,
      s.longitude,
      s.brand,
      s.city,
      s.province,
      st_distance(s.location, st_point(user_lng, user_lat)::geography)::double precision as dist
    from stations s
    where s.is_active = true
      and st_distance(s.location, st_point(user_lng, user_lat)::geography) < radius_meters
    order by dist
    limit limit_count
  ),
  latest_prices as (
    select distinct on (n.id, cpf.fuel_type)
      n.id,
      cpf.fuel_type,
      cpf.price,
      cpf.created_at,
      (cpf.created_at at time zone 'America/Guayaquil') as created_ec,
      fp.created_by
    from nearby n
    join current_fuel_prices cpf on cpf.station_id = n.id
    left join fuel_prices fp on fp.station_id = cpf.station_id and fp.fuel_type = cpf.fuel_type and fp.created_at = cpf.created_at
  ),
  station_trust as (
    select
      lp.id,
      avg(u.reputation)::double precision as avg_rep
    from latest_prices lp
    join users u on u.id = lp.created_by
    group by lp.id
  )
  select
    n.id,
    n.name,
    n.latitude,
    n.longitude,
    n.dist,
    lp.price,
    lp.fuel_type,
    case
      when lp.created_ec is null then 'stale'
      when lp.created_ec::date = v_cycle_start::date then 'fresh'
      when lp.created_ec >= v_cycle_start then 'recent'
      else 'stale'
    end::text,
    least(100, greatest(10, round(
      coalesce(st.avg_rep, 0) * 4 +
      case
        when lp.created_ec is null then 0
        when lp.created_ec::date = v_cycle_start::date then 15
        when lp.created_ec >= v_cycle_start then 10
        else 0
      end
    )::integer)),
    n.brand,
    n.city,
    n.province,
    lp.created_at
  from nearby n
  left join latest_prices lp on lp.id = n.id
  left join station_trust st on st.id = n.id
  order by n.dist, lp.fuel_type;
end;
$function$;
