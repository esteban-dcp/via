import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Camera, Map, Marker, UserLocation, type CameraRef } from '@maplibre/maplibre-react-native';
import { Text } from './ui/Text';
import { useLocationStore } from '../state/locationStore';
import { colors, fonts, radius } from '../theme';
import type { StationMarker } from '../types';

type Props = {
  interactive?: boolean;
  markers?: StationMarker[];
  onMarkerPress?: (station: StationMarker) => void;
  selectedStationId?: string;
  bestStationId?: string;
  mapRef?: React.MutableRefObject<any>;
  topContentOffset?: number;
  /** Identifica el conjunto cargado; la cámara solo se reencuadra cuando cambia (no al filtrar). */
  fitKey?: string;
  onError?: () => void;
};

// OpenFreeMap: estilo vectorial gratuito, sin API key. Atribución: OpenFreeMap, OpenMapTiles, OpenStreetMap.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const DEFAULT_CENTER: [number, number] = [-78.4678, -0.1807]; // Quito [lng, lat]
const DEFAULT_ZOOM = 12;
const FOCUS_ZOOM = 14;

const formatPrice = (price?: number | null) => (price ? `$${price.toFixed(2)}` : '?');

export const MapBackground = ({
  interactive = false,
  markers = [],
  onMarkerPress,
  selectedStationId,
  bestStationId,
  mapRef: externalRef,
  topContentOffset = 0,
  fitKey,
  onError,
}: Props) => {
  const coords = useLocationStore((s) => s.coords);
  const source = useLocationStore((s) => s.source);
  const cameraRef = useRef<CameraRef>(null);
  const internalRef = useRef<any>(null);
  const mapRef = externalRef ?? internalRef;
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  const centeredOnUser = useRef(!!coords && source === 'live');
  const initialCenter = useRef<[number, number]>(coords ? [coords.longitude, coords.latitude] : DEFAULT_CENTER);

  // Solo se sigue al usuario en el primer fix; después la cámara es del usuario.
  useEffect(() => {
    if (!coords || source !== 'live' || centeredOnUser.current) return;
    centeredOnUser.current = true;
    cameraRef.current?.flyTo({ center: [coords.longitude, coords.latitude], zoom: FOCUS_ZOOM, duration: 600 });
  }, [coords, source]);

  // Encuadra estaciones + usuario únicamente cuando cambia el conjunto de estaciones.
  const markersKey = fitKey ?? markers.map((m) => m.stationId).join('|');
  useEffect(() => {
    const user = coordsRef.current;
    if (!user || markers.length === 0) return;
    const lngs = [...markers.map((m) => m.longitude), user.longitude];
    const lats = [...markers.map((m) => m.latitude), user.latitude];
    // Span mínimo (~0.01°) para que una estación pegada al usuario no haga zoom extremo.
    const pad = (min: number, max: number): [number, number] => {
      const span = Math.max(max - min, 0.01);
      const mid = (min + max) / 2;
      return [mid - span / 2, mid + span / 2];
    };
    const [west, east] = pad(Math.min(...lngs), Math.max(...lngs));
    const [south, north] = pad(Math.min(...lats), Math.max(...lats));
    const t = setTimeout(() => {
      cameraRef.current?.fitBounds(
        [west, south, east, north],
        { padding: { top: topContentOffset + 60, right: 60, bottom: 160, left: 60 }, duration: 500 },
      );
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markersKey, topContentOffset]);

  mapRef.current = {
    animateToRegion: () => {},
    recenter: () => {
      const user = coordsRef.current;
      if (user) cameraRef.current?.flyTo({ center: [user.longitude, user.latitude], zoom: FOCUS_ZOOM, duration: 400 });
    },
  };

  const handlePress = useCallback((station: StationMarker) => onMarkerPress?.(station), [onMarkerPress]);

  return (
    <View style={styles.container} pointerEvents={interactive ? 'auto' : 'none'}>
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE}
        compass={false}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, left: 8 }}
        onDidFailLoadingMap={() => onError?.()}
      >
        <Camera ref={cameraRef} initialViewState={{ center: initialCenter.current, zoom: DEFAULT_ZOOM }} />
        <UserLocation animated />
        {markers.map((m) => {
          const isBest = m.stationId === bestStationId;
          const isSelected = m.stationId === selectedStationId;
          return (
            <Marker
              key={m.stationId}
              id={m.stationId}
              lngLat={[m.longitude, m.latitude]}
              anchor="bottom"
              selected={isSelected}
              onPress={() => handlePress(m)}
            >
              <View accessible accessibilityRole="button" accessibilityLabel={`${m.name} ${formatPrice(m.price)}`}>
                <View style={[styles.pin, isSelected && styles.pinSelected, isBest && styles.pinBest]}>
                  <Text style={[styles.pinText, (isBest || isSelected) && styles.pinTextOn]}>{formatPrice(m.price)}</Text>
                </View>
                <View style={[styles.pinTip, isSelected && styles.pinTipSelected, isBest && styles.pinTipBest]} />
              </View>
            </Marker>
          );
        })}
      </Map>
    </View>
  );
};

MapBackground.displayName = 'MapBackground';

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: colors.background },
  pin: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: 'center',
  },
  pinSelected: { backgroundColor: colors.success, borderColor: colors.success },
  pinBest: { backgroundColor: colors.warning, borderColor: colors.warning },
  pinText: { fontFamily: fonts.extrabold, fontSize: 12, color: colors.textPrimary },
  pinTextOn: { color: colors.background },
  pinTip: {
    alignSelf: 'center',
    width: 8,
    height: 8,
    marginTop: -5,
    backgroundColor: colors.card,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.textSecondary,
    transform: [{ rotate: '45deg' }],
  },
  pinTipSelected: { backgroundColor: colors.success, borderColor: colors.success },
  pinTipBest: { backgroundColor: colors.warning, borderColor: colors.warning },
});
