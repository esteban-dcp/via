import { useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, radius } from '../../theme';

type Props = { width?: ViewStyle['width']; height?: number; radius?: number; style?: ViewStyle };

export const Skeleton = ({ width = '100%', height = 16, radius: r = radius.sm, style }: Props) => {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [p]);
  const anim = useAnimatedStyle(() => ({ opacity: 0.35 + p.value * 0.4 }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: r, backgroundColor: colors.surface1 }, anim, style]}
    />
  );
};
