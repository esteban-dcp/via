import { useEffect, useState } from 'react';
import { StyleSheet, TextInputProps, View } from 'react-native';
import { Text, TextInput } from './Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing, typography } from '../../theme';

type Props = TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  rightAction?: React.ReactNode;
};

export const TextField = ({ label, icon, error, rightAction, style, ...rest }: Props) => {
  const [focused, setFocused] = useState(false);
  const borderColor = useSharedValue(0);

  useEffect(() => {
    borderColor.value = withTiming(error ? 2 : focused ? 1 : 0, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [focused, error, borderColor]);

  const animatedRowStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(borderColor.value, [0, 1, 2], [colors.border, colors.accent, colors.danger]),
  }));

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View style={[styles.row, animatedRowStyle]}>
        {icon && <Ionicons name={icon} size={18} color={error ? colors.danger : colors.textSecondary} />}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightAction}
      </Animated.View>
      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.medium,
    paddingVertical: 10,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
});
