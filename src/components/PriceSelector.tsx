import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Text } from './ui/Text';
import { colors, fonts, motion, radius, spacing, typography } from '../theme';

const ITEM_HEIGHT = 44;
const COLUMN_WIDTH = 48;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
// Tres copias de 0-9 para que el giro sea infinito sin saltos visibles.
const STRIP = [...DIGITS, ...DIGITS, ...DIGITS];

const mod10 = (n: number) => {
  'worklet';
  return ((n % 10) + 10) % 10;
};

type DigitColumnProps = {
  digit: number;
  label: string;
  onChange: (next: number) => void;
};

/** Rueda de un dígito, estilo reloj de mesa: arrastra, lanza o toca el dígito vecino. */
function DigitColumn({ digit, label, onChange }: DigitColumnProps) {
  // pos: posición flotante de la rueda (0..10); el dígito activo es round(pos) mod 10.
  const pos = useSharedValue(digit);
  const lastTick = useSharedValue(digit);

  const tick = useCallback((d: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(d);
  }, [onChange]);

  // Sincroniza con el valor externo (OCR, edición) por el camino más corto.
  useEffect(() => {
    const current = mod10(Math.round(pos.value));
    if (current === digit) return;
    let delta = digit - current;
    if (delta > 5) delta -= 10;
    if (delta < -5) delta += 10;
    lastTick.value = digit;
    pos.value = withSpring(Math.round(pos.value) + delta, motion.spring);
  }, [digit, pos, lastTick]);

  const settle = (target: number) => {
    'worklet';
    const rounded = Math.round(Math.max(pos.value - 8, Math.min(pos.value + 8, target)));
    pos.value = withSpring(rounded, motion.spring, (finished) => {
      // Normaliza para que la rueda nunca salga del rango de las tres copias.
      if (finished) pos.value = mod10(pos.value);
    });
    const d = mod10(rounded);
    if (d !== lastTick.value) {
      lastTick.value = d;
      runOnJS(tick)(d);
    }
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      pos.value = mod10(pos.value); // detiene animaciones y normaliza (las copias son idénticas)
    })
    .onChange((e) => {
      pos.value -= e.changeY / ITEM_HEIGHT;
      const d = mod10(Math.round(pos.value));
      if (d !== lastTick.value) {
        lastTick.value = d;
        runOnJS(tick)(d);
      }
    })
    .onEnd((e) => {
      const projected = pos.value - e.velocityY / ITEM_HEIGHT / 6;
      settle(projected);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    if (e.y < ITEM_HEIGHT) settle(Math.round(pos.value) - 1);
    else if (e.y > ITEM_HEIGHT * 2) settle(Math.round(pos.value) + 1);
  });

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(pos.value + 10 - 1) * ITEM_HEIGHT }],
  }));

  const adjust = (dir: 1 | -1) => settle(Math.round(pos.value) + dir);

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View
        style={colStyles.window}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: String(digit) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => adjust(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        <Animated.View style={stripStyle}>
          {STRIP.map((d, i) => (
            <Text key={i} style={colStyles.digit}>{d}</Text>
          ))}
        </Animated.View>
        <LinearGradient
          pointerEvents="none"
          colors={[colors.surface3, 'rgba(1,15,76,0)', 'rgba(1,15,76,0)', colors.surface3]}
          locations={[0, 0.3, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={colStyles.band} />
      </View>
    </GestureDetector>
  );
}

const colStyles = StyleSheet.create({
  window: {
    width: COLUMN_WIDTH,
    height: ITEM_HEIGHT * 3,
    overflow: 'hidden',
    borderRadius: radius.sm,
  },
  digit: {
    height: ITEM_HEIGHT,
    lineHeight: ITEM_HEIGHT,
    textAlign: 'center',
    fontFamily: fonts.extrabold,
    fontSize: 32,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  band: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: 'rgba(74, 122, 248, 0.12)',
  },
});

type Props = {
  label: string;
  value: number;
  step?: number;
  onChange: (next: number) => void;
};

export const PriceSelector = ({ label, value, onChange }: Props) => {
  const cents = Math.min(9999, Math.max(0, Math.round(value * 100)));
  const tens = Math.floor(cents / 1000) % 10;
  const units = Math.floor(cents / 100) % 10;
  const tenths = Math.floor(cents / 10) % 10;
  const hundredths = cents % 10;

  const setDigit = useCallback((place: 1000 | 100 | 10 | 1, digit: number) => {
    const current = Math.floor(cents / place) % 10;
    onChange((cents + (digit - current) * place) / 100);
  }, [cents, onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} accessibilityLabel={`${label}: ${value.toFixed(2)} dólares`}>${value.toFixed(2)}</Text>
      </View>
      <GestureHandlerRootView style={styles.spinnerRow}>
        <Text style={styles.currency}>$</Text>
        <DigitColumn digit={tens} label={`${label}, decenas`} onChange={(d) => setDigit(1000, d)} />
        <DigitColumn digit={units} label={`${label}, unidades`} onChange={(d) => setDigit(100, d)} />
        <Text style={styles.decimal}>.</Text>
        <DigitColumn digit={tenths} label={`${label}, décimas`} onChange={(d) => setDigit(10, d)} />
        <DigitColumn digit={hundredths} label={`${label}, centésimas`} onChange={(d) => setDigit(1, d)} />
      </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface3,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { ...typography.label, color: colors.textSecondary },
  value: { ...typography.captionBold, color: colors.accentSoft, fontVariant: ['tabular-nums'] },
  spinnerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  currency: { fontFamily: fonts.extrabold, fontSize: 28, color: colors.textSecondary, marginRight: 4 },
  decimal: { fontFamily: fonts.extrabold, fontSize: 32, color: colors.textPrimary, marginHorizontal: 2, alignSelf: 'center', marginTop: 2 },
});
