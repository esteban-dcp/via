import { useEffect } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { monthlyFreshnessLabel, monthlyFreshnessVariant, monthlyFreshnessIcon } from '../utils/freshness';
import type { StationResult } from '../types';

type Props = {
  result: StationResult | null;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

export const FuelCard = ({ result }: Props) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!result) {
    return (
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="search-outline" size={28} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Sin estaciones encontradas</Text>
          <Text style={styles.emptySubtitle}>Intenta ampliar tu área de búsqueda.</Text>
        </View>
      </Animated.View>
    );
  }

  const fbVariant = monthlyFreshnessVariant(result.priceDate);
  const fbIcon = monthlyFreshnessIcon(result.priceDate);
  const fbLabel = monthlyFreshnessLabel(result.priceDate);

  const openMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
    Linking.openURL(url).catch(() => {});
  };

  const handleShare = () => {
    Share.share({
      message: `⛽ ${result.name}\n📍 ${result.fuelType.toUpperCase()} — $${result.price.toFixed(2)}\n📏 ${formatDistance(result.distanceMeters)}`,
    }).catch(() => {});
  };

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.topRow}>
        <Text style={styles.label}>Mejor estación</Text>
        <Badge variant="info" label={`Confianza ${result.trustScore}`} icon="shield-checkmark" />
      </View>

      <Text style={styles.name}>{result.name}</Text>

      <View style={styles.distanceRow}>
        <Ionicons name="navigate" size={14} color={colors.textSecondary} />
        <Text style={styles.distance}>{formatDistance(result.distanceMeters)}</Text>
      </View>

      <View style={styles.priceSection}>
        <Text style={styles.priceLabel}>Mejor precio</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${result.price.toFixed(2)}</Text>
          <Badge variant="info" label={FUEL_DISPLAY[result.fuelType]} />
        </View>
      </View>

      <View style={styles.tags}>
        <Badge variant={fbVariant} label={fbLabel} icon={fbIcon} />
      </View>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <Button title="Navegar" icon="navigate" variant="primary" size="sm" onPress={openMaps} style={{ flex: 1 }} />
        <Button title="Compartir" icon="share-outline" variant="secondary" size="sm" onPress={handleShare} style={{ flex: 1 }} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  distanceRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  distance: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
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
    marginTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
