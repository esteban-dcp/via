import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { getStationPrices } from '../services/supabase';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { monthlyFreshnessLabel, monthlyFreshnessVariant, monthlyFreshnessIcon } from '../utils/freshness';
import type { FuelPriceInput, FuelType, StationMarker } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 420;

type Props = {
  station: StationMarker | null;
  onClose: () => void;
  onToggleFav?: (stationId: string) => void;
  isFav?: boolean;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const StationDetailSheet = ({ station, onClose, onToggleFav, isFav }: Props) => {
  const [prices, setPrices] = useState<FuelPriceInput>({});
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (station) {
      translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
      backdropOpacity.value = withTiming(1, { duration: 200 });
      getStationPrices(station.stationId).then(setPrices).catch(() => {});
    } else {
      translateY.value = SHEET_HEIGHT;
      backdropOpacity.value = 0;
    }
  }, [station]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleFavPress = useCallback(() => {
    if (station && onToggleFav) {
      onToggleFav(station.stationId);
    }
  }, [station, onToggleFav]);

  if (!station) return null;

  const openMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    Linking.openURL(url).catch(() => {});
  };

  const allFuelTypes: FuelType[] = ['ecopais', 'super', 'diesel'];
  const hasMultiPrices = allFuelTypes.some((ft) => prices[ft] != null);

  return (
    <Modal transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.wrapper} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="location" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{station.name}</Text>
                <Text style={styles.distance}>{formatDistance(station.distanceMeters)}</Text>
              </View>
              {onToggleFav && (
                <Pressable onPress={handleFavPress} style={styles.favBtn}>
                  <Ionicons
                    name={isFav ? 'star' : 'star-outline'}
                    size={20}
                    color={isFav ? '#FFD700' : colors.textMuted}
                  />
                </Pressable>
              )}
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {station.brand && (
            <View style={styles.brandRow}>
              <Ionicons name="business" size={13} color={colors.textMuted} />
              <Text style={styles.brandText}>
                {[station.brand, station.city, station.province].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}

          {hasMultiPrices ? (
            <View style={styles.allPrices}>
              <Text style={styles.allPricesLabel}>Precios actuales</Text>
              <View style={styles.priceGrid}>
                {allFuelTypes.map((ft) => {
                  const p = prices[ft];
                  if (p == null) return null;
                  return (
                    <View key={ft} style={styles.priceChip}>
                      <Text style={styles.priceChipFuel}>{FUEL_DISPLAY[ft]}</Text>
                      <Text style={styles.priceChipValue}>${p.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : station.price != null ? (
            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Mejor precio</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>${station.price.toFixed(2)}</Text>
                {station.fuelType && (
                  <Badge variant="info" label={FUEL_DISPLAY[station.fuelType]} style={{ alignSelf: 'center' }} />
                )}
              </View>
            </View>
          ) : null}

          <View style={styles.tags}>
            <Badge
              variant={monthlyFreshnessVariant(station.priceDate)}
              label={monthlyFreshnessLabel(station.priceDate)}
              icon={monthlyFreshnessIcon(station.priceDate)}
            />
            {station.trustScore != null && (
              <Badge
                variant="neutral"
                label={`Confianza ${station.trustScore}`}
                icon="shield-checkmark"
              />
            )}
          </View>

          <View style={styles.actions}>
            <Button
              variant="primary"
              title="Navegar"
              icon="navigate"
              onPress={openMaps}
              size="md"
              style={{ flex: 1 }}
            />
            <Button
              variant="secondary"
              title="Compartir"
              icon="share-outline"
              onPress={() => {}}
              size="md"
              style={{ width: 100 }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    ...shadows.lg,
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
  header: {
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  distance: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  favBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  brandText: {
    color: colors.textMuted,
    fontSize: 12,
    flex: 1,
  },
  allPrices: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  allPricesLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  priceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.glass,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceChipFuel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceChipValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  priceSection: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  priceLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    ...typography.price,
    color: colors.textPrimary,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
