import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MapBackground } from '../components/MapView';
import { MapSearchBar } from '../components/MapSearchBar';
import { StationDetailSheet } from '../components/StationDetailSheet';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Text } from '../components/ui/Text';
import { toast } from '../state/toastStore';
import { useFavoritesStore } from '../state/favoritesStore';
import { useLocationStore } from '../state/locationStore';
import { useUserStore } from '../state/userStore';
import { getBestStation } from '../services/pricing';
import { stationRepository } from '../services/stationRepository';
import { colors, fonts, radius, shadows, spacing } from '../theme';
import type { StationMarker } from '../types';

const SEARCH_HEIGHT = 52;

export const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const top = insets.top + spacing.md;
  const coords = useLocationStore((s) => s.coords);
  const status = useLocationStore((s) => s.status);
  const locationError = useLocationStore((s) => s.error);
  const startWatching = useLocationStore((s) => s.startWatching);
  const stopWatching = useLocationStore((s) => s.stopWatching);
  const profile = useUserStore((s) => s.profile);
  const consumeAccess = useUserStore((s) => s.consumeAccess);
  const favIds = useFavoritesStore((s) => s.ids);
  const loadFavs = useFavoritesStore((s) => s.load);
  const toggleFav = useFavoritesStore((s) => s.toggle);
  const navigation = useNavigation<any>();
  const [allMarkers, setAllMarkers] = useState<StationMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [mapOffline, setMapOffline] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState<StationMarker | null>(null);
  const [bestStationId, setBestStationId] = useState<string | undefined>(undefined);
  const mapRef = useRef<any>(null);
  const requestId = useRef(0);

  const accessRemaining = profile?.access_remaining ?? 0;
  const locked = accessRemaining <= 0;
  const preferredFuel = profile?.preferred_fuel;
  const permissionDenied = status === 'error' && !coords && !!locationError?.toLowerCase().includes('denegado');

  useEffect(() => {
    if (!isFocused) return;
    startWatching().catch(() => {});
    return () => stopWatching();
  }, [isFocused, startWatching, stopWatching]);

  useEffect(() => {
    if (profile) loadFavs(profile.id);
  }, [profile, loadFavs]);

  const load = useCallback(async () => {
    if (!coords) return;
    const id = ++requestId.current;
    setLoading(true);
    setFailed(false);
    try {
      const markers = await stationRepository.getNearbyStations(coords);
      if (id !== requestId.current) return;
      setAllMarkers(markers);
      const best = await getBestStation(coords, preferredFuel);
      if (id === requestId.current) setBestStationId(best?.stationId);
    } catch {
      if (id !== requestId.current) return;
      setAllMarkers([]);
      setFailed(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [coords, preferredFuel]);

  // Carga inicial al tener coords y al cambiar el combustible preferido.
  const hasCoords = !!coords;
  useEffect(() => {
    if (hasCoords) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords, preferredFuel]);

  // Reintentar no cuesta acceso: solo recarga.
  const handleRetry = useCallback(() => {
    stationRepository.invalidateNearbyCache();
    setMapOffline(false);
    void load();
  }, [load]);

  // El icono de actualizar sí consume un acceso.
  const handleRefresh = useCallback(() => {
    handleRetry();
    if (!locked) consumeAccess().catch(() => {});
  }, [handleRetry, locked, consumeAccess]);

  const filteredMarkers = useMemo(() => {
    let result = allMarkers;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (preferredFuel) {
      const preferred = allMarkers.filter((m) => m.fuelType === preferredFuel);
      if (preferred.length > 0) result = result.filter((m) => m.fuelType === preferredFuel);
    }
    return result;
  }, [allMarkers, search, preferredFuel]);

  const handleMarkerPress = useCallback((station: StationMarker) => setSelectedStation(station), []);
  const handleCloseSheet = useCallback(() => setSelectedStation(null), []);
  const handleContribute = useCallback(() => navigation.navigate('Contribute'), [navigation]);
  const handleRecenter = useCallback(() => {
    if (!coords) return toast.info('Aún no tenemos tu ubicación');
    mapRef.current?.recenter?.();
  }, [coords]);

  return (
    <View style={styles.container}>
      <MapBackground
        mapRef={mapRef}
        interactive
        markers={filteredMarkers}
        onMarkerPress={handleMarkerPress}
        selectedStationId={selectedStation?.stationId}
        bestStationId={bestStationId}
        onError={() => setMapOffline(true)}
      />

      {locked ? (
        <Animated.View entering={FadeInDown.springify().damping(20)} style={[styles.lockedBanner, { top }]}>
          <Ionicons name="lock-closed" size={16} color={colors.warning} />
          <Text style={styles.lockedText}>Sin accesos. Contribuye para seguir buscando.</Text>
          <Button title="Contribuir" size="sm" variant="primary" onPress={handleContribute} />
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.springify().damping(20)} style={{ zIndex: 50 }}>
            <MapSearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} />
          </Animated.View>

          <Animated.View entering={FadeIn.delay(150)} style={[styles.accessPill, { top: top + SEARCH_HEIGHT + spacing.sm }]}>
            <Ionicons name="flash" size={13} color={colors.warning} />
            <Text style={styles.accessText}>
              {accessRemaining} {accessRemaining === 1 ? 'acceso' : 'accesos'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInRight.delay(120).springify().damping(20)} style={[styles.controls, { top: top + SEARCH_HEIGHT + spacing.sm }]}>
            <IconButton icon="locate" label="Centrar en mi ubicación" onPress={handleRecenter} />
            <IconButton icon="refresh" label="Actualizar estaciones" onPress={handleRefresh} />
          </Animated.View>
        </>
      )}

      {(loading || status === 'loading') && !permissionDenied && (
        <View style={styles.loader} pointerEvents="none">
          <View style={styles.loaderBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loaderText}>Buscando estaciones</Text>
          </View>
        </View>
      )}

      {(permissionDenied || failed || mapOffline || (!loading && coords && allMarkers.length === 0 && !failed)) && (
        <Animated.View entering={FadeInDown.springify().damping(20)} style={[styles.notice, { bottom: insets.bottom + 12 + 64 + 76 }]}>
          <Ionicons
            name={permissionDenied ? 'location-outline' : failed || mapOffline ? 'cloud-offline-outline' : 'search-outline'}
            size={20}
            color={failed || mapOffline ? colors.danger : colors.accentSoft}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>
              {permissionDenied ? 'Activa tu ubicación' : mapOffline ? 'Mapa sin conexión' : failed ? 'No pudimos cargar estaciones' : 'Sin estaciones cerca'}
            </Text>
            <Text style={styles.noticeSub}>
              {permissionDenied ? 'La necesitamos para mostrar estaciones cercanas.' : failed || mapOffline ? 'Revisa tu conexión.' : 'Aún nadie ha reportado en tu zona.'}
            </Text>
          </View>
          <Button
            title={permissionDenied ? 'Ajustes' : 'Reintentar'}
            size="sm"
            variant="secondary"
            onPress={permissionDenied ? () => Linking.openSettings().catch(() => {}) : handleRetry}
          />
        </Animated.View>
      )}

      <StationDetailSheet
        station={selectedStation}
        onClose={handleCloseSheet}
        onToggleFav={profile ? (id) => toggleFav(profile.id, id) : undefined}
        isFav={selectedStation ? favIds.includes(selectedStation.stationId) : false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  controls: { position: 'absolute', right: spacing.md, gap: spacing.sm, zIndex: 40 },
  accessPill: {
    position: 'absolute',
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 40,
    ...shadows.sm,
  },
  accessText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textPrimary },
  loader: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  loaderBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, ...shadows.md },
  loaderText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textPrimary },
  lockedBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,181,71,0.5)',
    zIndex: 50,
    ...shadows.md,
  },
  lockedText: { flex: 1, fontFamily: fonts.semibold, fontSize: 12, color: colors.textPrimary },
  notice: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 45,
    ...shadows.md,
  },
  noticeTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  noticeSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
