import { ActivityIndicator, Pressable, PressableProps, StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = PressableProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  title: string;
  style?: StyleProp<ViewStyle>;
};

const sizeConfig: Record<ButtonSize, { h: number; px: number; iconSize: number; textStyle: TextStyle }> = {
  sm: { h: 40, px: spacing.md, iconSize: 16, textStyle: { ...typography.captionBold, fontSize: 13, letterSpacing: 0 } },
  md: { h: 48, px: spacing.lg, iconSize: 18, textStyle: { ...typography.bodyBold, fontSize: 14, lineHeight: 20 } },
  lg: { h: 52, px: spacing.lg, iconSize: 20, textStyle: { ...typography.bodyBold, fontSize: 15, lineHeight: 20 } },
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  title,
  disabled,
  style,
  ...rest
}: Props) => {
  
  const cfg = sizeConfig[size];
  const isDisabled = disabled || loading;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textPrimary : colors.textPrimary} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={cfg.iconSize} color={textColor()} />}
          <Text style={[cfg.textStyle, { color: textColor() }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </>
  );

  function textColor() {
    if (variant === 'primary') return colors.onPrimary;
    if (variant === 'danger') return colors.danger;
    return colors.textPrimary;
  }

  const bgMap: Record<ButtonVariant, string> = {
    secondary: colors.surface2,
    danger: colors.dangerLight,
    ghost: 'transparent',
    primary: colors.primary,
  };

  return (
    <Pressable
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      hitSlop={size === 'sm' ? { top: 4, bottom: 4 } : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: isDisabled && variant === 'primary' ? colors.surface3 : bgMap[variant],
          height: cfg.h,
          paddingHorizontal: cfg.px,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        variant === 'danger' && styles.dangerBorder,
        variant === 'secondary' && styles.secondaryBorder,
        style,
      ]}
      {...rest}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    minWidth: 48,
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  dangerBorder: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
});
