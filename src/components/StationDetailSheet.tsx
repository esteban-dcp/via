import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type HostInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { Sheet } from './ui/Sheet';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { ShareCard } from './ShareCard';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { getStationPrices } from '../services/supabase';
import { shareCardImage } from '../services/share';
import { useUserStore } from '../state/userStore';
import { toast } from '../state/toastStore';
import { getFreshness } from '../utils/freshness';
import { colors, hit, radius, spacing, typography } from '../theme';
import type { FuelPriceInput, FuelType, StationMarker, StationResult } from '../types';

type Props = {
  station: StationMarker | null;
  onClose: () => void;
  onToggleFav?: (stationId: string) => void;
  isFav?: boolean;
};

const ALL_FUELS: FuelType[] = ['ecopais', 'super', 'diesel'];

const formatDistance = (meters: number) => (meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`);

export const StationDetailSheet = ({ station, onClose, onToggleFav, isFav }: Props) => {
  const [prices, setPrices] = useState<FuelPriceInput>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<HostInstance>(null);
  const lastStation = useRef<StationMarker | null>(null);
  const userName = useUserStore((s) => s.profile?.display_name)?.split(' ')[0];
  if (station) lastStation.current = station;
  const current = station ?? lastStation.current;

  useEffect(() => {
    if (!station) return;
    let cancelled = false;
    setPrices({});
    setLoadingPrices(true);
    getStationPrices(station.stationId)
      .then((p) => !cancelled && setPrices(p))
      .catch(() => {})
      .finally(() => !cancelled && setLoadingPrices(false));
    return () => {
      cancelled = true;
    };
  }, [station]);

  const shareResult = useMemo<StationResult | null>(() => {
    if (!current || current.price == null) return null;
    return {
      stationId: current.stationId,
      name: current.name,
      latitude: current.latitude,
      longitude: current.longitude,
      fuelType: current.fuelType ?? 'ecopais',
      price: current.price,
      distanceMeters: current.distanceMeters,
      trustScore: current.trustScore ?? 50,
      freshness: current.freshness ?? 'stale',
      priceDate: current.priceDate,
    };
  }, [current]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      if (!(await shareCardImage(shareRef))) toast.error('Compartir no está disponible');
    } catch {
      toast.error('No se pudo generar la imagen');
    } finally {
      setSharing(false);
    }
  }, []);

  if (!current) return null;

  const openMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${current.latitude},${current.longitude}`;
    Linking.openURL(url).catch(() => toast.error('No se pudo abrir el mapa'));
  };

  const freshness = getFreshness(current.priceDate);
  const hasMultiPrices = ALL_FUELS.some((ft) => prices[ft] != null);

  return (
    <Sheet visible={!!station} onClose={onClose} accessibilityLabel={`Detalle de ${current.name}`}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>{current.name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="navigate" size={13} color={colors.textSecondary} />
            <Text style={styles.meta} numberOfLines={1}>
              {[formatDistance(current.distanceMeters), current.brand, current.city].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        {onToggleFav && (
          <Pressable
            onPress={() => onToggleFav(current.stationId)}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={isFav ? 'Quitar de favoritas' : 'Agregar a favoritas'}
            accessibilityState={{ selected: !!isFav }}
          >
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={22} color={isFav ? colors.warning : colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.tags}>
        <Badge variant={freshness.variant} label={freshness.label} icon={freshness.icon} />
        {current.trustScore != null && <Badge variant="neutral" label={`Fiabilidad ${current.trustScore}`} icon="shield-checkmark" />}
      </View>

      {loadingPrices ? (
        <View style={styles.grid}>
          {ALL_FUELS.map((f) => (
            <Skeleton key={f} height={78} style={{ flex: 1 }} radius={radius.md} />
          ))}
        </View>
      ) : hasMultiPrices ? (
        <View style={styles.grid}>
          {ALL_FUELS.map((ft) => {
            const p = prices[ft];
            const highlight = ft === current.fuelType;
            return (
              <View key={ft} style={[styles.priceTile, highlight && styles.priceTileActive, p == null && { opacity: 0.45 }]}>
                <Text style={styles.tileFuel}>{FUEL_DISPLAY[ft]}</Text>
                <Text style={styles.tilePrice}>{p != null ? `$${p.toFixed(2)}` : '—'}</Text>
              </View>
            );
          })}
        </View>
      ) : current.price != null ? (
        <View style={styles.grid}>
          <View style={[styles.priceTile, styles.priceTileActive]}>
            <Text style={styles.tileFuel}>{current.fuelType ? FUEL_DISPLAY[current.fuelType] : 'PRECIO'}</Text>
            <Text style={styles.tilePrice}>${current.price.toFixed(2)}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noPrices}>
          <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.noPricesText}>Esta estación aún no tiene precios reportados.</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Button variant="primary" title="Navegar" icon="navigate" onPress={openMaps} style={{ flex: 1.2 }} />
        {shareResult && (
          <Button variant="secondary" title="Compartir" icon="share-social-outline" loading={sharing} onPress={handleShare} style={{ flex: 1 }} />
        )}
      </View>

      {shareResult && (
        <View style={styles.offscreen} pointerEvents="none">
          <ShareCard ref={shareRef} result={shareResult} userName={userName} />
        </View>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  name: { ...typography.h3, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  iconBtn: { width: hit.min, height: hit.min, borderRadius: hit.min / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  grid: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  priceTile: { flex: 1, minHeight: 78, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
  priceTileActive: { borderColor: colors.accent, backgroundColor: 'rgba(74, 122, 248, 0.18)' },
  tileFuel: { ...typography.label, color: colors.textSecondary },
  tilePrice: { ...typography.h3, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  noPrices: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface3 },
  noPricesText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  offscreen: { position: 'absolute', left: -2000, top: 0 },
});
