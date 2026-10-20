import { ActivityIndicator, Pressable, PressableProps, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Text } from './Text';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useScalePress } from '../../hooks/useScalePress';
import { colors, radius, spacing, typography } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type Props = PressableProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  title: string;
  style?: ViewStyle;
};

const sizeConfig: Record<ButtonSize, { py: number; px: number; iconSize: number; textStyle: TextStyle }> = {
  sm: { py: 13, px: spacing.md, iconSize: 16, textStyle: typography.captionBold },
  md: { py: 15, px: spacing.lg, iconSize: 18, textStyle: typography.bodyBold },
  lg: { py: 18, px: spacing.xl, iconSize: 20, textStyle: typography.h4 },
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
  const { animatedStyle, onPressIn, onPressOut } = useScalePress(0.96);

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

  if (variant === 'primary') {
    return (
      <Animated.View style={[animatedStyle, style]}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          disabled={isDisabled}
          {...rest}
        >
          <LinearGradient
            colors={isDisabled ? [colors.surface3, colors.surface3] : [colors.primary, '#2F68FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, { paddingVertical: cfg.py, paddingHorizontal: cfg.px, opacity: isDisabled ? 0.5 : 1 }]}
          >
            {content}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  const bgMap: Record<ButtonVariant, string> = {
    secondary: colors.surface2,
    danger: colors.dangerLight,
    ghost: 'transparent',
    primary: 'transparent',
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          {
            backgroundColor: bgMap[variant],
            paddingVertical: cfg.py,
            paddingHorizontal: cfg.px,
            opacity: isDisabled ? 0.4 : 1,
          },
          variant === 'danger' && styles.dangerBorder,
          variant === 'secondary' && styles.secondaryBorder,
        ]}
        {...rest}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    minHeight: 48,
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
