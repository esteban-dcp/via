import { useCallback, useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../theme';

const ITEM_HEIGHT = 36;
const SNAP_THRESHOLD = ITEM_HEIGHT * 0.35;

type DigitColumnProps = {
  digit: number;
  max: number;
  onChange: (next: number) => void;
};

function DigitColumn({ digit, max, onChange }: DigitColumnProps) {
  const translateY = useSharedValue(0);
  const currentDigit = useRef(digit);
  const maxRef = useRef(max);
  const onChangeRef = useRef(onChange);
  currentDigit.current = digit;
  maxRef.current = max;
  onChangeRef.current = onChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        translateY.value = withTiming(0, { duration: 100 });
      },
      onPanResponderMove: (_, gs) => {
        translateY.value = gs.dy;
      },
      onPanResponderRelease: (_, gs) => {
        const delta = -gs.dy;
        if (Math.abs(delta) > SNAP_THRESHOLD) {
          const steps = Math.round(delta / ITEM_HEIGHT);
          let next = currentDigit.current + steps;
          next = ((next % (maxRef.current + 1)) + (maxRef.current + 1)) % (maxRef.current + 1);
          onChangeRef.current(next);
        }
        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      },
      onPanResponderTerminate: () => {
        translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      },
    }),
  ).current;

  const increment = useCallback(() => {
    const next = digit >= max ? 0 : digit + 1;
    onChange(next);
  }, [digit, max, onChange]);

  const decrement = useCallback(() => {
    const next = digit <= 0 ? max : digit - 1;
    onChange(next);
  }, [digit, max, onChange]);

  const topDigit = ((digit - 1) + (max + 1)) % (max + 1);
  const bottomDigit = ((digit + 1) + (max + 1)) % (max + 1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={colStyles.container}>
      <Pressable style={colStyles.arrow} onPress={increment}>
        <Text style={colStyles.arrowIcon}>▲</Text>
      </Pressable>
      <View style={colStyles.window} {...panResponder.panHandlers}>
        <Animated.View style={[colStyles.strip, animatedStyle]}>
          <Text style={colStyles.digitAdj}>{topDigit}</Text>
          <Text style={colStyles.digitActive}>{digit}</Text>
          <Text style={colStyles.digitAdj}>{bottomDigit}</Text>
        </Animated.View>
      </View>
      <Pressable style={colStyles.arrow} onPress={decrement}>
        <Text style={colStyles.arrowIcon}>▼</Text>
      </Pressable>
    </View>
  );
}

const colStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 36,
  },
  arrow: {
    paddingVertical: 3,
    alignItems: 'center',
    width: '100%',
  },
  arrowIcon: {
    color: colors.textMuted,
    fontSize: 8,
  },
  window: {
    height: ITEM_HEIGHT * 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strip: {
    alignItems: 'center',
  },
  digitAdj: {
    height: ITEM_HEIGHT,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: colors.textMuted,
    lineHeight: ITEM_HEIGHT,
    opacity: 0.5,
  },
  digitActive: {
    height: ITEM_HEIGHT,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: ITEM_HEIGHT,
  },
});

type Props = {
  label: string;
  value: number;
  step?: number;
  onChange: (next: number) => void;
};

export const PriceSelector = ({ label, value, step = 0.01, onChange }: Props) => {
  const integerPart = Math.floor(value);
  const fractionalPart = Math.round((value - integerPart) * 100);

  const tens = Math.floor(integerPart / 10) % 10;
  const units = integerPart % 10;
  const tenths = Math.floor(fractionalPart / 10) % 10;
  const hundredths = fractionalPart % 10;

  const updateDigit = useCallback((pos: 'tens' | 'units' | 'tenths' | 'hundredths', digit: number) => {
    let newInt = Math.floor(value);
    let newFrac = Math.round((value - newInt) * 100);

    switch (pos) {
      case 'tens':
        newInt = digit * 10 + (newInt % 10);
        break;
      case 'units':
        newInt = (Math.floor(newInt / 10) * 10) + digit;
        break;
      case 'tenths':
        newFrac = digit * 10 + (newFrac % 10);
        break;
      case 'hundredths':
        newFrac = (Math.floor(newFrac / 10) * 10) + digit;
        break;
    }

    const next = Number((newInt + newFrac / 100).toFixed(2));
    onChange(next);
  }, [value, onChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.spinnerRow}>
        <Text style={styles.currency}>$</Text>
        <DigitColumn digit={tens} max={9} onChange={(d) => updateDigit('tens', d)} />
        <DigitColumn digit={units} max={9} onChange={(d) => updateDigit('units', d)} />
        <Text style={styles.decimal}>.</Text>
        <DigitColumn digit={tenths} max={9} onChange={(d) => updateDigit('tenths', d)} />
        <DigitColumn digit={hundredths} max={9} onChange={(d) => updateDigit('hundredths', d)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currency: {
    color: colors.textSecondary,
    fontSize: 26,
    fontWeight: '800',
    marginRight: spacing.xs,
    marginTop: -2,
  },
  decimal: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: -4,
    marginHorizontal: 2,
  },
});
