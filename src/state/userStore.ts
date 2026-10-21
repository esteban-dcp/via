import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import type { FuelType, UserProfile } from '../types';
import { ensureUserProfile, refreshUserProfile, supabase } from '../services/supabase';
import { consumeAccess as consumeAccessRpc, grantAccess as grantAccessRpc } from '../services/pricing';

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://via.inntratec.com';

type UserState = {
  session: Session | null;
  profile: UserProfile | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null | undefined;
  bootstrap: () => Promise<() => void>;
  signInWithGoogle: () => Promise<void>;
  setSessionFromTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setSession: (session: Session | null) => void;
  refreshProfile: () => Promise<void>;
  consumeAccess: () => Promise<void>;
  grantAccess: (delta: number, reason: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updatePreferredFuel: (fuelType: FuelType | null) => Promise<void>;
};

const inflightProfiles = new Map<string, Promise<UserProfile | null>>();

const ensureProfileWithRetry = (session: Session, retries = 3): Promise<UserProfile | null> => {
  const key = session.user.id;
  const existing = inflightProfiles.get(key);
  if (existing) return existing;

  const run = (async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await ensureUserProfile(session);
      } catch {
        if (i < retries - 1) await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
    return null;
  })().finally(() => inflightProfiles.delete(key));

  inflightProfiles.set(key, run);
  return run;
};

export const useUserStore = create<UserState>((set, get) => ({
  session: null,
  profile: null,
  status: 'idle',
  error: null,
  setSession: (session) => set({ session }),

  signInWithGoogle: async () => {
    set({ status: 'loading', error: null });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${WEB_BASE_URL}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, 'via://auth/callback');

    if (result.type !== 'success') {
      if (result.type === 'cancel') {
        set({ status: 'idle', error: null });
      } else {
        set({ status: 'error', error: 'Autenticación cancelada' });
      }
      return;
    }

    const url = new URL(result.url);
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        set({ status: 'error', error: sessionError.message });
        return;
      }
      if (sessionData.session) {
        const profile = await ensureProfileWithRetry(sessionData.session);
        set({
          session: sessionData.session,
          profile,
          status: profile ? 'ready' : 'error',
          error: profile ? null : 'No se pudo crear tu perfil. Revisa tu conexión e inténtalo de nuevo.',
        });
      }
      return;
    }

    set({ status: 'error', error: 'No se pudo completar la autenticación. Asegúrate de usar Chrome o Safari como navegador predeterminado.' });
  },

  setSessionFromTokens: async (accessToken, refreshToken) => {
    set({ status: 'loading', error: null });
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      set({ status: 'error', error: error.message });
      return;
    }
    if (data.session) {
      const profile = await ensureProfileWithRetry(data.session);
      set({
        session: data.session,
        profile,
        status: profile ? 'ready' : 'error',
        error: profile ? null : 'No se pudo crear tu perfil. Revisa tu conexión e inténtalo de nuevo.',
      });
    }
  },

  bootstrap: async () => {
    set({ status: 'loading', error: null });

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        set({ status: 'error', error: error.message });
      } else {
        if (data.session) {
          const profile = await ensureProfileWithRetry(data.session);
          set({ session: data.session, profile, status: 'ready' });
        } else {
          set({ status: 'ready' });
        }
      }

      const { data: authData } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        set({ session: nextSession });
        if (nextSession) {
          const profile = await ensureProfileWithRetry(nextSession);
          if (profile) {
            set({ profile, status: 'ready' });
          } else {
            console.warn('[Auth] Could not create profile after retries, session active without profile');
            set({ status: 'ready' });
          }
        } else {
          set({ profile: null });
        }
      });

      return () => {
        authData.subscription.unsubscribe();
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      set({ status: 'error', error: errorMsg });
      return () => {};
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  deleteAccount: async () => {
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const profile = await refreshUserProfile(session.user.id);
    set({ profile });
  },

  consumeAccess: async () => {
    const session = get().session;
    if (!session) return;
    const remaining = await consumeAccessRpc(session.user.id);
    const profile = get().profile;
    if (profile) {
      set({ profile: { ...profile, access_remaining: remaining } });
    }
  },

  grantAccess: async (delta: number, reason: string) => {
    const session = get().session;
    if (!session) return;
    const remaining = await grantAccessRpc(session.user.id, delta, reason);
    const profile = get().profile;
    if (profile) {
      set({ profile: { ...profile, access_remaining: remaining } });
    }
  },

  updateDisplayName: async (name: string) => {
    const { profile, session } = get();
    if (!profile || !session) return;
    const { updateProfileName } = await import('../services/supabase');
    await updateProfileName(profile.id, name);
    set({ profile: { ...profile, display_name: name } });
  },

  updatePreferredFuel: async (fuelType: FuelType | null) => {
    const { profile, session } = get();
    if (!profile || !session) return;
    const { updatePreferredFuel } = await import('../services/supabase');
    await updatePreferredFuel(profile.id, fuelType);
    set({ profile: { ...profile, preferred_fuel: fuelType } });
  },
}));
