import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadows } from '../../theme';

type Props = {
  children: ReactNode;
  variant?: 'glass' | 'elevated' | 'flat';
  style?: ViewStyle;
};

export const Card = ({ children, variant = 'glass', style }: Props) => (
  <View style={[styles.base, variantStyles[variant], style]}>{children}</View>
);

const variantStyles: Record<string, ViewStyle> = {
  glass: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  elevated: {
    backgroundColor: colors.card,
    ...shadows.lg,
  },
  flat: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    padding: 24,
  },
});
