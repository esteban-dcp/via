import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import {
  distanceMeters,
  getFix,
  LocationError,
  startWatchingLocation,
  stopWatchingLocation,
  type Coordinates,
  type Fix,
  type LocationErrorCode,
} from '../services/location';
import { stationRepository } from '../services/stationRepository';

const STORAGE_KEY = 'via.lastLocation.v1';
/** Cambio mínimo de posición que invalida la caché de estaciones cercanas. */
const CACHE_INVALIDATE_M = 100;

type LocationState = {
  coords: Coordinates | null;
  accuracy: number | null;
  updatedAt: number | null;
  /** 'live' = fix real de esta sesión; 'cached' = último punto guardado. */
  source: 'live' | 'cached' | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorCode: LocationErrorCode | null;
  error: string | null;
  hydrate: () => Promise<void>;
  /** Fix fresco para escrituras (reportes). Lanza si no hay GPS. */
  getFreshFix: () => Promise<Fix>;
  refresh: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
};

// Un solo dueño (App.tsx): activo/inactivo, sin conteo. `session` invalida arranques en vuelo.
let active = false;
let session = 0;
let lastInvalidatedAt: Coordinates | null = null;

const persist = (fix: Fix) => {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fix)).catch(() => {});
};

export const useLocationStore = create<LocationState>((set, get) => {
  const applyFix = (fix: Fix) => {
    if (!lastInvalidatedAt || distanceMeters(lastInvalidatedAt, fix) > CACHE_INVALIDATE_M) {
      stationRepository.invalidateNearbyCache();
      lastInvalidatedAt = { latitude: fix.latitude, longitude: fix.longitude };
    }
    set({
      coords: { latitude: fix.latitude, longitude: fix.longitude },
      accuracy: fix.accuracy,
      updatedAt: fix.timestamp,
      source: 'live',
      status: 'ready',
      error: null,
      errorCode: null,
    });
    persist(fix);
  };

  const applyError = (e: unknown) => {
    const err = e instanceof LocationError ? e : new LocationError('unavailable', 'No se pudo obtener tu ubicación.');
    // Si hay un último punto (cacheado o previo) se conserva; el banner avisa que es aproximado.
    set((s) => ({ status: 'error', error: err.message, errorCode: err.code, source: s.coords ? 'cached' : null }));
  };

  return {
    coords: null,
    accuracy: null,
    updatedAt: null,
    source: null,
    status: 'idle',
    errorCode: null,
    error: null,

    hydrate: async () => {
      if (get().coords) return;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || get().coords) return;
        const fix = JSON.parse(raw) as Fix;
        if (typeof fix.latitude !== 'number' || typeof fix.longitude !== 'number') return;
        set({
          coords: { latitude: fix.latitude, longitude: fix.longitude },
          accuracy: fix.accuracy ?? null,
          updatedAt: fix.timestamp ?? null,
          source: 'cached',
        });
      } catch {}
    },

    getFreshFix: async () => {
      const fix = await getFix(0);
      applyFix(fix);
      return fix;
    },

    refresh: async () => {
      if (!get().coords) set({ status: 'loading' });
      try {
        applyFix(await getFix(0));
      } catch (e) {
        // Con un stream vivo y un fix reciente, un timeout puntual no degrada a "aproximada".
        const { source, updatedAt } = get();
        if (source === 'live' && updatedAt && Date.now() - updatedAt < 5 * 60 * 1000) return;
        applyError(e);
      }
    },

    startWatching: async () => {
      active = true;
      const mine = ++session;
      if (!get().coords) set({ status: 'loading', error: null, errorCode: null });
      try {
        const fix = await getFix();
        if (!active || mine !== session) return;
        applyFix(fix);
        await startWatchingLocation(applyFix);
        // Detenido mientras se suscribía: no dejar el GPS encendido.
        if (!active || mine !== session) stopWatchingLocation();
      } catch (e) {
        if (active && mine === session) applyError(e);
      }
    },

    stopWatching: () => {
      active = false;
      session++;
      stopWatchingLocation();
    },
  };
});
