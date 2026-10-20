import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import type { FuelType, FuelPriceInput, UserProfile, UserReport } from '../types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

export const ensureUserProfile = async (session: Session): Promise<UserProfile> => {
  const authId = session.user.id;
  const displayName = session.user.user_metadata?.full_name ?? session.user.email ?? 'VIA User';

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle();

  if (existing) return existing as UserProfile;

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert({
      auth_id: authId,
      display_name: displayName,
    })
    .select('*')
    .single();

  if (insertError?.code === '23505') {
    const { data: retry } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single();
    if (retry) return retry as UserProfile;
  }

  if (insertError || !inserted) throw insertError ?? new Error('No se pudo crear tu perfil');

  return inserted as UserProfile;
};

export const refreshUserProfile = async (authId: string): Promise<UserProfile> => {
  const { data, error } = await supabase.from('users').select('*').eq('auth_id', authId).single();
  if (error || !data) {
    throw error;
  }
  return data as UserProfile;
};

export const updateProfileName = async (profileId: string, displayName: string): Promise<void> => {
  const { error } = await supabase.from('users').update({ display_name: displayName }).eq('id', profileId);
  if (error) throw error;
};

export const updatePreferredFuel = async (profileId: string, fuelType: FuelType | null): Promise<void> => {
  const { error } = await supabase.from('users').update({ preferred_fuel: fuelType }).eq('id', profileId);
  if (error) throw error;
};

export const getUserReports = async (profileId: string, limit = 10): Promise<UserReport[]> => {
  const { data, error } = await supabase
    .from('reports')
    .select('id, station_id, station:stations(name), ocr_json, status, created_at')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    station_name: r.station?.name ?? null,
    prices: r.ocr_json ?? {},
    status: r.status,
    created_at: r.created_at,
  }));
};

export const getStationPrices = async (stationId: string): Promise<FuelPriceInput> => {
  const { data, error } = await supabase
    .from('fuel_prices')
    .select('fuel_type, price')
    .eq('station_id', stationId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const latest: Record<string, number> = {};
  for (const row of data ?? []) {
    const ft = row.fuel_type as FuelType;
    if (!latest[ft]) {
      latest[ft] = Number(row.price);
    }
  }
  return latest as FuelPriceInput;
};
