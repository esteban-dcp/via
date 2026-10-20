import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FuelCard } from '../components/FuelCard';
import { MapBackground } from '../components/MapView';
import { OnboardingModal } from '../components/OnboardingModal';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { useLocationStore } from '../state/locationStore';
import { useUserStore } from '../state/userStore';
import { getBestStation } from '../services/pricing';
import { stationRepository } from '../services/stationRepository';
import { colors, spacing } from '../theme';
import type { StationMarker } from '../types';

const needsOnboarding = (profile: { display_name: string | null; preferred_fuel: string | null } | null) => {
  if (!profile) return false;
  return !profile.preferred_fuel;
};

export const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const { coords, refresh, startWatching, stopWatching, status: locationStatus } = useLocationStore();
  const { profile } = useUserStore();
  const [bestStationResult, setBestStationResult] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const mapOffsetY = insets.top + spacing.xl + 40 + spacing.md + 260;
  const [refreshing, setRefreshing] = useState(false);
  const preferredFuel = profile?.preferred_fuel;
  const prevFuelRef = useRef(preferredFuel);
  const hasAnimated = useRef(false);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(16);
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(24);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    headerOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    headerTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });

    setTimeout(() => {
      cardOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
      cardTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
    }, 200);
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  useEffect(() => {
    if (profile && needsOnboarding(profile)) {
      setShowOnboarding(true);
    }
  }, [profile]);

  const bestStationMarkers = useMemo(() => {
    if (!bestStationResult) return [];
    return [{
      stationId: bestStationResult.stationId,
      name: bestStationResult.name,
      latitude: bestStationResult.latitude,
      longitude: bestStationResult.longitude,
      distanceMeters: bestStationResult.distanceMeters,
      price: bestStationResult.price,
      fuelType: bestStationResult.fuelType,
      trustScore: bestStationResult.trustScore,
      freshness: bestStationResult.freshness,
      priceDate: bestStationResult.priceDate,
    } satisfies StationMarker];
  }, [bestStationResult]);

  const loadBestStation = useCallback(async (isRefresh = false) => {
    if (!coords) return;
    if (isRefresh) setRefreshing(true);
    try {
      const best = await getBestStation(coords, preferredFuel);
      setBestStationResult(best);
    } catch {
    } finally {
      setRefreshing(false);
    }
  }, [coords, preferredFuel]);

  useEffect(() => {
    startWatching().catch(() => {});
    return () => stopWatching();
  }, [startWatching, stopWatching]);

  useEffect(() => {
    if (coords) {
      void loadBestStation();
    }
  }, [coords, loadBestStation]);

  useEffect(() => {
    if (preferredFuel !== prevFuelRef.current) {
      prevFuelRef.current = preferredFuel;
      if (coords) {
        void loadBestStation();
      }
    }
  }, [preferredFuel, coords, loadBestStation]);

  const handleRefresh = useCallback(() => {
    refresh().catch(() => {});
    stationRepository.invalidateNearbyCache();
    void loadBestStation(true);
  }, [refresh, loadBestStation]);

  return (
    <View style={styles.container}>
      <MapBackground markers={bestStationMarkers} bestStationId={bestStationResult?.stationId} topContentOffset={mapOffsetY} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Animated.View style={[styles.welcomeRow, headerStyle]}>
          <Text style={styles.greeting}>
            {profile?.display_name ? `Hola, ${profile.display_name.split(' ')[0]}` : 'Hola'}
          </Text>
          {preferredFuel && (
            <View style={styles.fuelBadge}>
              <Text style={styles.fuelBadgeText}>{FUEL_DISPLAY[preferredFuel]}</Text>
            </View>
          )}
        </Animated.View>
        {bestStationResult && (
          <Animated.View style={[styles.featuredCard, cardStyle]}>
            <FuelCard result={bestStationResult} />
          </Animated.View>
        )}
      </ScrollView>
      {!coords && (
        <Text style={styles.hint}>Activa la ubicación para encontrar los mejores precios</Text>
      )}

      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  greeting: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  fuelBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: 4,
  },
  fuelBadgeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featuredCard: {
    marginTop: spacing.md,
  },
  hint: {
    color: colors.textSecondary,
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
});
