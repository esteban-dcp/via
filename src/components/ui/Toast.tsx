import { useEffect, useRef } from 'react';
import { ColorValue, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useToastStore, type ToastVariant } from '../../state/toastStore';
import { colors, motion, radius, shadows, spacing, typography } from '../../theme';

const variantConfig: Record<ToastVariant, { colors: readonly [ColorValue, ColorValue]; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { colors: ['rgba(53,208,127,0.22)', colors.card] as const, icon: 'checkmark-circle' },
  error: { colors: ['rgba(255,92,92,0.22)', colors.card] as const, icon: 'alert-circle' },
  info: { colors: ['rgba(74,122,248,0.25)', colors.card] as const, icon: 'information-circle' },
};

const ToastItem = ({ id, message, variant }: { id: string; message: string; variant: ToastVariant }) => {
  const hide = useToastStore((s) => s.hide);
  const translateY = useSharedValue(40);
  const opacity = useSharedValue(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    translateY.value = withSpring(0, motion.spring);
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const cfg = variantConfig[variant];

  const iconColor = variant === 'info' ? colors.accentSoft : variant === 'success' ? colors.success : colors.danger;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable onPress={() => hide(id)} accessibilityRole="alert" accessibilityLabel={message}>
        <LinearGradient colors={cfg.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.toast}>
          <Ionicons name={cfg.icon} size={18} color={iconColor} />
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
    gap: spacing.sm,
  },
  wrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  message: {
    flex: 1,
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
});
