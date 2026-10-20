import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from './ui/Text';
import { Sheet } from './ui/Sheet';
import { Skeleton } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';
import { stationRepository } from '../services/stationRepository';
import { colors, fonts, radius, spacing, typography } from '../theme';
import type { StationMarker } from '../types';
import type { Coordinates } from '../services/location';

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
      setError('No pudimos cargar las estaciones. Revisa tu conexión.');
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
    <Sheet visible onClose={onClose} fill maxHeightRatio={0.75} accessibilityLabel="Seleccionar estación">
      <Text style={styles.title}>¿En qué estación estás?</Text>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Buscar estación por nombre"
        />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={{ gap: spacing.sm }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={56} radius={radius.md} />
            ))}
          </View>
        ) : error ? (
          <EmptyState icon="alert-circle-outline" tone="danger" title="Algo salió mal" message={error} actionLabel="Reintentar" onAction={loadStations} />
        ) : !hasStations ? (
          <EmptyState icon="location-outline" title="Sin resultados" message="No hay estaciones con ese nombre cerca de ti." actionLabel="Reintentar" onAction={loadStations} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item: StationMarker) => item.stationId}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }: { item: StationMarker }) => {
              const selected = item.stationId === selectedId;
              return (
                <Pressable
                  style={({ pressed }) => [styles.station, selected && styles.stationSelected, pressed && { backgroundColor: colors.surface2 }]}
                  onPress={() => handleSelect(item)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${item.name}, a ${formatDistance(item.distanceMeters)}`}
                >
                  <View style={styles.pin}>
                    <Ionicons name="location" size={16} color={colors.accentSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stationName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.stationDist}>{formatDistance(item.distanceMeters)}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={colors.success} />}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  title: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 15 },
  content: { flex: 1 },
  listContent: { gap: spacing.xs, paddingBottom: spacing.lg },
  station: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent' },
  stationSelected: { borderColor: colors.success, backgroundColor: 'rgba(53,208,127,0.08)' },
  pin: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  stationName: { ...typography.bodyBold, color: colors.textPrimary },
  stationDist: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
