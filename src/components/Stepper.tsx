import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './ui/Text';
import { colors, fonts, motion, spacing } from '../theme';

type Props = { steps: string[]; current: number };

const Dot = ({ state, index }: { state: 'done' | 'active' | 'todo'; index: number }) => {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(state === 'active' ? 1.1 : 1, motion.spring) }] }));
  return (
    <Animated.View
      style={[
        styles.dot,
        state === 'done' && styles.dotDone,
        state === 'active' && styles.dotActive,
        style,
      ]}
    >
      {state === 'done' ? (
        <Ionicons name="checkmark" size={14} color={colors.background} />
      ) : (
        <Text style={[styles.dotText, state === 'active' && { color: colors.onPrimary }]}>{index + 1}</Text>
      )}
    </Animated.View>
  );
};

export const Stepper = ({ steps, current }: Props) => (
  <View style={styles.row} accessible accessibilityLabel={`Paso ${current + 1} de ${steps.length}: ${steps[current]}`}>
    {steps.map((label, i) => {
      const state = i < current ? 'done' : i === current ? 'active' : 'todo';
      return (
        <View key={label} style={styles.item}>
          <View style={styles.dotRow}>
            <Dot state={state} index={i} />
            {i < steps.length - 1 && <View style={[styles.line, i < current && styles.lineDone]} />}
          </View>
          <Text style={[styles.label, state !== 'todo' && { color: colors.textPrimary }]} numberOfLines={1}>{label}</Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.lg },
  item: { flex: 1 },
  dotRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.border },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.accent },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textSecondary },
  line: { flex: 1, height: 2, marginHorizontal: 6, borderRadius: 1, backgroundColor: colors.surface3 },
  lineDone: { backgroundColor: colors.success },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textMuted, marginTop: 6 },
});
