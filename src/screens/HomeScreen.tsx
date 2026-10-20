import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FuelCard } from '../components/FuelCard';
import { OnboardingModal } from '../components/OnboardingModal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Text } from '../components/ui/Text';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { useLocationStore } from '../state/locationStore';
import { useUserStore } from '../state/userStore';
import { getBestStation } from '../services/pricing';
import { stationRepository } from '../services/stationRepository';
import { nextPriceChange } from '../utils/priceCycle';
import { colors, motion, radius, spacing, typography } from '../theme';
import type { StationResult } from '../types';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const enter = (i: number) => FadeInDown.delay(i * motion.stagger * 2).springify().damping(20).stiffness(180);

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const coords = useLocationStore((s) => s.coords);
  const locationStatus = useLocationStore((s) => s.status);
  const locationError = useLocationStore((s) => s.error);
  const refresh = useLocationStore((s) => s.refresh);
  const startWatching = useLocationStore((s) => s.startWatching);
  const stopWatching = useLocationStore((s) => s.stopWatching);
  const profile = useUserStore((s) => s.profile);
  const [best, setBest] = useState<StationResult | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const preferredFuel = profile?.preferred_fuel;
  const showOnboarding = !!profile && !profile.preferred_fuel;
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const requestId = useRef(0);

  const loadBest = useCallback(async (isRefresh = false) => {
    if (!coords) return;
    const id = ++requestId.current;
    if (isRefresh) setRefreshing(true);
    else setLoadState((s) => (s === 'ready' ? s : 'loading'));
    try {
      const result = await getBestStation(coords, preferredFuel);
      if (id !== requestId.current) return;
      setBest(result);
      setLoadState(result ? 'ready' : 'empty');
    } catch {
      if (id !== requestId.current) return;
      setLoadState('error');
    } finally {
      if (id === requestId.current) setRefreshing(false);
    }
  }, [coords, preferredFuel]);

  useEffect(() => {
    startWatching().catch(() => {});
    return () => stopWatching();
  }, [startWatching, stopWatching]);

  useEffect(() => {
    void loadBest();
  }, [loadBest]);

  const handleRefresh = useCallback(() => {
    refresh().catch(() => {});
    stationRepository.invalidateNearbyCache();
    void loadBest(true);
  }, [refresh, loadBest]);

  const permissionDenied = locationStatus === 'error' && !coords && !!locationError?.toLowerCase().includes('denegado');
  const locationFailed = locationStatus === 'error' && !coords && !permissionDenied;
  const firstName = profile?.display_name?.split(' ')[0];
  const cycle = nextPriceChange();
  const isPriceDay = new Date().getDate() === 12;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#011360', '#011360', '#010E4A']} style={StyleSheet.absoluteFill} />
      <View style={styles.orb} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 190 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.card} />
        }
      >
        <Animated.View entering={enter(0)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>{firstName ? `Hola, ${firstName}` : 'Hola'}</Text>
            <Text style={styles.title}>Tu mejor opción{'\n'}ahora mismo</Text>
          </View>
          {preferredFuel && (
            <View style={styles.fuelChip} accessible accessibilityLabel={`Combustible: ${FUEL_DISPLAY[preferredFuel]}`}>
              <Ionicons name="water" size={13} color={colors.accentSoft} />
              <Text style={styles.fuelChipText}>{FUEL_DISPLAY[preferredFuel]}</Text>
            </View>
          )}
        </Animated.View>

        {permissionDenied ? (
          <Animated.View entering={enter(1)} style={styles.stateCard}>
            <EmptyState
              icon="location-outline"
              title="Necesitamos tu ubicación"
              message="Así encontramos la estación con mejor precio cerca de ti."
              actionLabel="Abrir ajustes"
              onAction={() => Linking.openSettings().catch(() => {})}
            />
          </Animated.View>
        ) : locationFailed ? (
          <Animated.View entering={enter(1)} style={styles.stateCard}>
            <EmptyState icon="locate-outline" tone="danger" title="No pudimos ubicarte" message={locationError ?? undefined} actionLabel="Reintentar" onAction={handleRefresh} />
          </Animated.View>
        ) : loadState === 'loading' || !coords ? (
          <View style={styles.stateCard}>
            <Skeleton width={110} height={24} radius={12} />
            <Skeleton width="80%" height={30} style={{ marginTop: spacing.md }} />
            <Skeleton width="55%" height={56} style={{ marginTop: spacing.md }} />
            <Skeleton height={44} style={{ marginTop: spacing.lg }} />
          </View>
        ) : loadState === 'error' ? (
          <Animated.View entering={enter(1)} style={styles.stateCard}>
            <EmptyState icon="cloud-offline-outline" tone="danger" title="No pudimos cargar los precios" message="Revisa tu conexión e inténtalo de nuevo." actionLabel="Reintentar" onAction={handleRefresh} />
          </Animated.View>
        ) : loadState === 'empty' || !best ? (
          <Animated.View entering={enter(1)} style={styles.stateCard}>
            <EmptyState
              icon="search-outline"
              title="Aún no hay precios cerca"
              message={preferredFuel ? `Nadie ha reportado ${FUEL_DISPLAY[preferredFuel]} en tu zona. ¡Sé el primero!` : 'Nadie ha reportado precios en tu zona. ¡Sé el primero!'}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={enter(1)}>
            <FuelCard result={best} userName={firstName} />
          </Animated.View>
        )}

        <Animated.View entering={enter(2)} style={[styles.cycle, isPriceDay && styles.cycleToday]}>
          <View style={[styles.cycleIcon, isPriceDay && { backgroundColor: colors.success }]}>
            <Ionicons name={isPriceDay ? 'flash' : 'calendar-outline'} size={18} color={isPriceDay ? colors.background : colors.accentSoft} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cycleTitle}>{isPriceDay ? 'Hoy cambian los precios' : 'Próximo ajuste de precios'}</Text>
            <Text style={styles.cycleSub}>
              {isPriceDay
                ? 'Reporta primero y gana recompensas extra.'
                : `El 12 de ${cycle.date.toLocaleDateString('es-EC', { month: 'long' })} · en ${cycle.days} ${cycle.days === 1 ? 'día' : 'días'}`}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <OnboardingModal visible={showOnboarding && !onboardingDismissed} onComplete={() => setOnboardingDismissed(true)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  orb: { position: 'absolute', top: -120, right: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(3, 74, 248, 0.22)' },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm },
  overline: { ...typography.bodyBold, color: colors.textSecondary },
  title: { ...typography.h1, color: colors.textPrimary, marginTop: spacing.xs },
  fuelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  fuelChipText: { ...typography.captionBold, color: colors.textPrimary, letterSpacing: 0.8 },
  stateCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cycle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderLight },
  cycleToday: { borderColor: 'rgba(53,208,127,0.45)', backgroundColor: 'rgba(53,208,127,0.1)' },
  cycleIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cycleTitle: { ...typography.bodyBold, color: colors.textPrimary },
  cycleSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
});
