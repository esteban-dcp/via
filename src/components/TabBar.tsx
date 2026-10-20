import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from './ui/Text';
import { colors, fonts, motion, shadows } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_CONFIG: Record<string, { focused: IconName; unfocused: IconName; label: string }> = {
  Home: { focused: 'pricetag', unfocused: 'pricetag-outline', label: 'Mejor' },
  Map: { focused: 'map', unfocused: 'map-outline', label: 'Mapa' },
  Profile: { focused: 'person', unfocused: 'person-outline', label: 'Perfil' },
};

const BAR_HEIGHT = 64;
const BAR_SIDE = 20;
const CTA_ROUTES = new Set(['Home', 'Map']);

export const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const visibleRoutes = state.routes.filter((r) => r.name !== 'Contribute');
  const [barWidth, setBarWidth] = useState(0);
  const activeName = state.routes[state.index]?.name;
  const activeVisibleIndex = Math.max(0, visibleRoutes.findIndex((r) => r.name === activeName));
  const onContribute = activeName === 'Contribute';
  const showCta = !!activeName && CTA_ROUTES.has(activeName);

  const slot = barWidth / Math.max(visibleRoutes.length, 1);
  const indicatorX = useSharedValue(0);
  const ctaVisible = useSharedValue(showCta ? 1 : 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    indicatorX.value = withSpring(activeVisibleIndex * slot, motion.spring);
  }, [activeVisibleIndex, slot, indicatorX]);

  useEffect(() => {
    ctaVisible.value = withSpring(showCta ? 1 : 0, motion.spring);
  }, [showCta, ctaVisible]);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
  }, [pulse]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: slot,
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaVisible.value,
    transform: [{ translateY: (1 - ctaVisible.value) * 16 }, { scale: 0.92 + ctaVisible.value * 0.08 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.22,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  const handleCta = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    navigation.navigate('Contribute');
  }, [navigation]);

  if (onContribute) return null;

  const bottom = insets.bottom + 12;

  return (
    <>
      <Animated.View
        pointerEvents={showCta ? 'box-none' : 'none'}
        style={[styles.ctaWrap, { bottom: bottom + BAR_HEIGHT + 12 }, ctaStyle]}
      >
        <Animated.View style={[styles.ctaGlow, glowStyle]} />
        <Pressable
          onPress={handleCta}
          accessibilityRole="button"
          accessibilityLabel="Capturar precios de una estación"
          style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <Ionicons name="camera" size={18} color={colors.onPrimary} />
          <Text style={styles.ctaText}>Capturar precio</Text>
        </Pressable>
      </Animated.View>

      <View
        style={[styles.bar, { bottom }]}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width - 12)}
      >
        <View style={styles.inner}>
          {barWidth > 0 && <Animated.View style={[styles.indicator, indicatorStyle]} />}
          {visibleRoutes.map((route) => {
            const { options } = descriptors[route.key];
            const isFocused = route.name === activeName;
            const cfg = TAB_CONFIG[route.name];

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) {
                Haptics.selectionAsync().catch(() => {});
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityLabel={options.title ?? route.name}
                accessibilityState={{ selected: isFocused }}
                style={styles.tab}
              >
                {cfg && (
                  <Ionicons
                    name={isFocused ? cfg.focused : cfg.unfocused}
                    size={21}
                    color={isFocused ? colors.onPrimary : colors.textSecondary}
                  />
                )}
                <Text style={[styles.label, { color: isFocused ? colors.onPrimary : colors.textMuted }]}>{cfg?.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: BAR_SIDE,
    right: BAR_SIDE,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6,
    ...shadows.lg,
  },
  inner: { flex: 1, flexDirection: 'row' },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 26,
    backgroundColor: colors.primary,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  label: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 0.2 },
  ctaWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  ctaGlow: {
    position: 'absolute',
    width: 190,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    ...shadows.md,
  },
  ctaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onPrimary, letterSpacing: 0.1 },
});
