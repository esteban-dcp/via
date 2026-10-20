import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TextInput } from './ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '../theme';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onClear: () => void;
};

export const MapSearchBar = ({ value, onChange, onClear }: Props) => {
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, { top: insets.top + spacing.md }]}>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Buscar estación"
          accessibilityLabel="Buscar estación"
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <Pressable onPress={onClear} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 50,
    ...shadows.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputRowFocused: {
    borderColor: colors.accent,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  clearBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
