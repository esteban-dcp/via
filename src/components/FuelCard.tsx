import { memo, useCallback, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { colors, radius, shadows, spacing, typography } from '../theme';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { ShareCard } from './ShareCard';
import { shareCardImage } from '../services/share';
import { toast } from '../state/toastStore';
import { getFreshness } from '../utils/freshness';
import type { StationResult } from '../types';

type Props = {
  result: StationResult;
  userName?: string | null;
};

const formatDistance = (meters: number) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

const reliabilityLabel = (score: number) => (score >= 75 ? 'Muy fiable' : score >= 45 ? 'Fiable' : 'Poco verificado');

export const FuelCard = memo(({ result, userName }: Props) => {
  const shareRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const freshness = getFreshness(result.priceDate);
  const score = Math.max(0, Math.min(100, result.trustScore));

  const openMaps = useCallback(() => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${result.latitude},${result.longitude}`;
    Linking.openURL(url).catch(() => toast.error('No se pudo abrir el mapa'));
  }, [result.latitude, result.longitude]);

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const ok = await shareCardImage(shareRef);
      if (!ok) toast.error('Compartir no está disponible en este dispositivo');
    } catch {
      toast.error('No se pudo generar la imagen');
    } finally {
      setSharing(false);
    }
  }, []);

  return (
    <View style={styles.card}>
      <LinearGradient colors={[colors.highlight, 'transparent']} style={styles.sheen} pointerEvents="none" />

      <View style={styles.topRow}>
        <Badge variant={freshness.variant} label={freshness.label} icon={freshness.icon} />
        <Text style={styles.distance}>
          <Ionicons name="navigate" size={12} color={colors.textSecondary} /> {formatDistance(result.distanceMeters)}
        </Text>
      </View>

      <Text style={styles.name} numberOfLines={2}>{result.name}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.currency}>$</Text>
        <Text style={styles.price}>{result.price.toFixed(2)}</Text>
        <View style={styles.fuelPill}>
          <Text style={styles.fuelText}>{FUEL_DISPLAY[result.fuelType]}</Text>
        </View>
      </View>

      <View style={styles.reliability} accessible accessibilityLabel={`Fiabilidad ${reliabilityLabel(score)}, ${score} de 100`}>
        <View style={styles.reliabilityHead}>
          <Ionicons name="shield-checkmark" size={14} color={colors.accentSoft} />
          <Text style={styles.reliabilityText}>{reliabilityLabel(score)}</Text>
          <Text style={styles.reliabilityScore}>{score}/100</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${score}%` }]} />
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button title="Navegar" icon="navigate" variant="primary" size="md" onPress={openMaps} style={{ flex: 1.2 }} accessibilityLabel={`Navegar a ${result.name}`} />
        <Button title="Compartir" icon="share-social-outline" variant="secondary" size="md" loading={sharing} onPress={handleShare} style={{ flex: 1 }} accessibilityLabel="Compartir como imagen" />
      </View>

      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard ref={shareRef} result={result} userName={userName} />
      </View>
    </View>
  );
});
FuelCard.displayName = 'FuelCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.md,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  distance: { ...typography.captionBold, color: colors.textSecondary },
  name: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.md, gap: 2 },
  currency: { ...typography.h2, color: colors.accentSoft, marginBottom: 6 },
  price: { ...typography.price, fontSize: 56, lineHeight: 60, color: colors.textPrimary },
  fuelPill: {
    marginLeft: spacing.sm,
    marginBottom: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fuelText: { ...typography.label, color: colors.textPrimary },
  reliability: { marginTop: spacing.lg, gap: spacing.xs },
  reliabilityHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reliabilityText: { ...typography.captionBold, color: colors.textPrimary, flex: 1 },
  reliabilityScore: { ...typography.caption, color: colors.textSecondary },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  offscreen: { position: 'absolute', left: -2000, top: 0 },
});
