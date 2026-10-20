import * as Location from 'expo-location';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationCallback = (coords: Coordinates) => void;

let watchSubscription: Location.LocationSubscription | null = null;

export const requestLocation = async (): Promise<Coordinates> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado.');
  }

  const position = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
  ]).then(async (p) => p ?? (await Location.getLastKnownPositionAsync()));

  if (!position) {
    throw new Error('No se pudo obtener tu ubicación.');
  }

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};

const DISTANCE_THRESHOLD = 50;

let lastCoords: Coordinates | null = null;
let watchToken = 0;

export const startWatchingLocation = async (
  onLocationUpdate: LocationCallback,
): Promise<void> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return;

  stopWatchingLocation();
  const token = ++watchToken;

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: DISTANCE_THRESHOLD,
      timeInterval: 15000,
    },
    (position) => {
      const coords: Coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      if (
        !lastCoords ||
        Math.abs(coords.latitude - lastCoords.latitude) > 0.0005 ||
        Math.abs(coords.longitude - lastCoords.longitude) > 0.0005
      ) {
        lastCoords = coords;
        onLocationUpdate(coords);
      }
    },
  );

  // A newer start/stop superseded this call while awaiting: drop the stale subscription
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
  lastCoords = null;
};
