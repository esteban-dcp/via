import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

type Props = {
  variant?: BadgeVariant;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md';
  style?: ViewStyle;
};

const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  danger: { bg: colors.dangerLight, text: colors.danger },
  info: { bg: 'rgba(74, 122, 248, 0.2)', text: colors.accentSoft },
  neutral: { bg: colors.surface1, text: colors.textSecondary },
};

export const Badge = ({ variant = 'neutral', label, icon, size = 'md', style }: Props) => {
  const cfg = variantConfig[variant];

  return (
    <View style={[styles.badge, size === 'sm' && styles.badgeSm, { backgroundColor: cfg.bg }, style]}>
      {icon && <Ionicons name={icon} size={size === 'sm' ? 10 : 12} color={cfg.text} />}
      <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: cfg.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  label: {
    ...typography.captionBold,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  labelSm: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
