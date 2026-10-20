import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { stationRepository } from '../services/stationRepository';
import { Button } from './ui/Button';
import { colors, radius, shadows, spacing, typography } from '../theme';
import type { StationMarker } from '../types';
import type { Coordinates } from '../services/location';

const SHEET_HEIGHT = 420;

type Props = {
  selectedId: string | null;
  userCoords: Coordinates | null;
  onSelect: (station: StationMarker) => void;
  onClose: () => void;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const StationSelector = ({ selectedId, userCoords, onSelect, onClose }: Props) => {
  const [stations, setStations] = useState<StationMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
    backdropOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const loadStations = useCallback(async () => {
    if (!userCoords) {
      setLoading(false);
      setError('Ubicación no disponible.');
      return;
    }
    setLoading(true);
    setError(null);
    setStations([]);
    try {
      const results = await stationRepository.getNearbyStations(userCoords, 10000, 50);
      if (results.length === 0) {
        setError('No se encontraron estaciones en un radio amplio. Prueba otra ubicación.');
      } else {
        setStations(results);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userCoords]);

  useEffect(() => {
    loadStations();
  }, [loadStations]);

  const filtered = useMemo(() => {
    if (!search.trim()) return stations;
    const q = search.toLowerCase();
    return stations.filter(
      (s) => s.name.toLowerCase().includes(q),
    );
  }, [stations, search]);

  const handleSelect = useCallback(
    (station: StationMarker) => {
      onSelect(station);
    },
    [onSelect],
  );

  const hasStations = filtered.length > 0;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <View style={styles.wrapper} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.kbWrapper}
        >
          <Animated.View
            style={[
              styles.sheet,
              sheetStyle,
            ]}
          >
            <View style={styles.headerSection}>
              <View style={styles.handle} />
              <Text style={styles.title}>Seleccionar estación</Text>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar estaciones cercanas..."
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            <View style={styles.contentSection}>
              {loading && (
                <View style={styles.centerWrap}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.centerText}>Buscando estaciones de servicio cercanas...</Text>
                </View>
              )}

              {error && !loading && (
                <View style={styles.centerWrap}>
                  <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
                  <Text style={[styles.centerText, { color: colors.danger }]}>{error}</Text>
                  <Button
                    title="Reintentar"
                    icon="refresh"
                    variant="secondary"
                    size="sm"
                    onPress={loadStations}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              )}

              {!loading && !error && !hasStations && (
                <View style={styles.centerWrap}>
                  <Ionicons name="location-outline" size={40} color={colors.textMuted} />
                  <Text style={styles.centerText}>
                    No se encontraron estaciones cercanas. Reintenta o verifica tu ubicación.
                  </Text>
                  <Button
                    title="Reintentar"
                    icon="refresh"
                    variant="secondary"
                    size="sm"
                    onPress={loadStations}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              )}

              {!loading && hasStations && (
                <FlatList
                  data={filtered}
                  keyExtractor={(item: StationMarker) => item.stationId}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }: { item: StationMarker }) => (
                      <Pressable
                        style={styles.station}
                        onPress={() => handleSelect(item)}
                      >
                        <View style={styles.radio}>
                          <Ionicons name="location" size={16} color={colors.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stationName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <View style={styles.stationMeta}>
                            <Ionicons name="navigate" size={12} color={colors.textMuted} />
                            <Text style={styles.stationDist}>
                              {formatDistance(item.distanceMeters)}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="add-circle" size={22} color={colors.primary} />
                      </Pressable>
                    )}
                />
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  kbWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 0,
    ...shadows.lg,
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  contentSection: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.xs,
  },
  station: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  radio: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stationDist: {
    ...typography.caption,
    color: colors.textMuted,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  centerText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
