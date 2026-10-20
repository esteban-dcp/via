import type { Ref } from 'react';
import type { HostInstance } from 'react-native';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './ui/Text';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { getFreshness } from '../utils/freshness';
import { colors, fonts } from '../theme';
import type { StationResult } from '../types';

/** Tamaño lógico 360x450; se captura a 1080x1350. Solo iconos, sin emojis. */
export const SHARE_CARD_SIZE = { width: 360, height: 450, outWidth: 1080, outHeight: 1350 };

const PILL_BG = { success: 'rgba(53,208,127,0.95)', warning: 'rgba(255,181,71,0.95)', danger: 'rgba(255,92,92,0.95)', neutral: 'rgba(166,176,214,0.9)' } as const;

type Props = { result: StationResult; userName?: string | null };

const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

export const ShareCard = ({ result, userName, ref }: Props & { ref?: Ref<HostInstance> }) => {
  const freshness = getFreshness(result.priceDate);
  return (
    <View ref={ref} collapsable={false} style={styles.root}>
      <LinearGradient colors={[colors.background, colors.card, colors.primary]} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.orbA} />
      <View style={styles.orbB} />

      <View style={styles.brandRow}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brand}>VIA</Text>
      </View>

      <View style={styles.center}>
        <View style={[styles.pill, { backgroundColor: PILL_BG[freshness.variant] }]}>
          <Ionicons name={freshness.icon} size={14} color={colors.background} />
          <Text style={styles.pillText}>{freshness.label}</Text>
        </View>
        <Text style={styles.kicker}>Mejor precio cerca de mí</Text>
        <Text style={styles.price} adjustsFontSizeToFit numberOfLines={1}>${result.price.toFixed(2)}</Text>
        <View style={styles.fuelRow}>
          <Ionicons name="water" size={16} color={colors.accentSoft} />
          <Text style={styles.fuel}>{FUEL_DISPLAY[result.fuelType]}</Text>
        </View>
        <Text style={styles.station} numberOfLines={2}>{result.name}</Text>
        <View style={styles.fuelRow}>
          <Ionicons name="navigate" size={13} color={colors.textSecondary} />
          <Text style={styles.distance}>a {formatDistance(result.distanceMeters)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <View style={styles.footerRow}>
          <View style={styles.people}>
            <Ionicons name="people" size={16} color={colors.onPrimary} />
          </View>
          <Text style={styles.footerText} numberOfLines={2}>
            {userName ? `${userName} ahorra con VIA` : 'Ahorra con la comunidad VIA'}
          </Text>
        </View>
        <Text style={styles.footerSub}>Precios de combustible reportados por conductores</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: SHARE_CARD_SIZE.width, height: SHARE_CARD_SIZE.height, padding: 28, overflow: 'hidden', backgroundColor: colors.background, justifyContent: 'space-between' },
  orbA: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(74,122,248,0.28)', top: -90, right: -80 },
  orbB: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(53,208,127,0.12)', bottom: 60, left: -90 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 9 },
  brand: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.onPrimary, letterSpacing: 2 },
  center: { alignItems: 'center', gap: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, marginBottom: 10 },
  pillText: { fontFamily: fonts.bold, fontSize: 12, color: colors.background },
  kicker: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, letterSpacing: 0.4 },
  price: { fontFamily: fonts.extrabold, fontSize: 84, color: colors.onPrimary, letterSpacing: -3, lineHeight: 92, maxWidth: 300 },
  fuelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fuel: { fontFamily: fonts.bold, fontSize: 14, color: colors.accentSoft, letterSpacing: 1.5 },
  station: { fontFamily: fonts.bold, fontSize: 20, color: colors.onPrimary, textAlign: 'center', marginTop: 8, maxWidth: 290 },
  distance: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  footer: { gap: 10 },
  footerLine: { height: 1, backgroundColor: 'rgba(255,255,255,0.14)' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  people: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  footerText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
  footerSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
});
