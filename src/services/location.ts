import * as Location from 'expo-location';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Fix = Coordinates & {
  /** Precisión horizontal en metros (si el sistema la reporta). */
  accuracy: number | null;
  /** Epoch ms del fix. */
  timestamp: number;
};

export type LocationErrorCode = 'denied' | 'services_off' | 'timeout' | 'unavailable';

export class LocationError extends Error {
  code: LocationErrorCode;
  constructor(code: LocationErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

type FixCallback = (fix: Fix) => void;

const FIX_TIMEOUT_MS = 12000;
/** Un fix cacheado del sistema solo vale si es más reciente que esto. */
const LAST_KNOWN_MAX_AGE_MS = 2 * 60 * 1000;
const WATCH_DISTANCE_M = 25;
const WATCH_INTERVAL_MS = 5000;

const toFix = (p: Location.LocationObject): Fix => ({
  latitude: p.coords.latitude,
  longitude: p.coords.longitude,
  accuracy: p.coords.accuracy ?? null,
  timestamp: p.timestamp,
});

/** Verifica permiso y servicios; lanza LocationError tipado si no se puede ubicar. */
export const ensureLocationReady = async (): Promise<void> => {
  let { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    ({ status } = await Location.requestForegroundPermissionsAsync());
  }
  if (status !== 'granted') {
    throw new LocationError('denied', 'Permiso de ubicación denegado.');
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new LocationError('services_off', 'El GPS está desactivado.');
  }
};

/**
 * Obtiene un fix. `maxAgeMs` permite aceptar uno reciente del sistema;
 * con 0 siempre se fuerza lectura nueva (usar al reportar precios).
 */
export const getFix = async (maxAgeMs = LAST_KNOWN_MAX_AGE_MS): Promise<Fix> => {
  await ensureLocationReady();

  if (maxAgeMs > 0) {
    const last = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs }).catch(() => null);
    if (last) return toFix(last);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const position = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), FIX_TIMEOUT_MS);
    }),
  ])
    .catch(() => null)
    .finally(() => clearTimeout(timer));

  if (!position) throw new LocationError('timeout', 'No se pudo obtener tu ubicación.');
  return toFix(position);
};

let watchSubscription: Location.LocationSubscription | null = null;
let watchToken = 0;

export const startWatchingLocation = async (onFix: FixCallback): Promise<void> => {
  stopWatchingLocation();
  const token = ++watchToken;

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: WATCH_DISTANCE_M,
      timeInterval: WATCH_INTERVAL_MS,
    },
    (position) => onFix(toFix(position)),
  );

  // Una llamada más nueva reemplazó a esta mientras esperaba: descartar la suscripción vieja.
  if (token !== watchToken) {
    subscription.remove();
    return;
  }
  watchSubscription = subscription;
};

export const stopWatchingLocation = (): void => {
  watchToken++;
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }
};

/** Distancia en metros entre dos puntos (haversine). */
export const distanceMeters = (a: Coordinates, b: Coordinates): number => {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
