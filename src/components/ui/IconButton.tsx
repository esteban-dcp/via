import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useScalePress } from '../../hooks/useScalePress';
import { colors, hit } from '../../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: number;
  tone?: 'surface' | 'primary' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
};

export const IconButton = ({ icon, label, onPress, size = 20, tone = 'surface', style, disabled }: Props) => {
  const { animatedStyle, onPressIn, onPressOut } = useScalePress(0.92);
  const bg = tone === 'primary' ? colors.primary : tone === 'ghost' ? 'transparent' : colors.card;
  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.base, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, tone !== 'ghost' && styles.border]}
      >
        <Ionicons name={icon} size={size} color={tone === 'primary' ? colors.onPrimary : colors.textPrimary} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: { width: hit.min, height: hit.min, borderRadius: hit.min / 2, alignItems: 'center', justifyContent: 'center' },
  border: { borderWidth: 1, borderColor: colors.border },
});
