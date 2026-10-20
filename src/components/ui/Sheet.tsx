import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, radius, shadows, spacing } from '../../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Altura máxima como fracción de la pantalla. */
  maxHeightRatio?: number;
  /** Si es true, el contenido ocupa la altura máxima (útil con listas). */
  fill?: boolean;
  accessibilityLabel?: string;
};

/** Bottom sheet con spring, backdrop y cierre arrastrando hacia abajo. */
export const Sheet = ({ visible, onClose, children, maxHeightRatio = 0.85, fill = false, accessibilityLabel }: Props) => {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [kb, setKb] = useState(0);
  const translateY = useSharedValue(screenH);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const finish = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  const dismiss = useCallback(() => {
    backdrop.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(screenH, { duration: 220 }, (done) => {
      if (done) runOnJS(finish)();
    });
  }, [backdrop, translateY, screenH, finish]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.value = screenH;
      translateY.value = withSpring(0, motion.springSoft);
      backdrop.value = withTiming(1, { duration: 220 });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: 180 });
      translateY.value = withTiming(screenH, { duration: 220 }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      translateY.value = Math.max(0, translateY.value + e.changeY);
      backdrop.value = Math.max(0, 1 - translateY.value / (screenH * 0.5));
    })
    .onEnd((e) => {
      if (e.velocityY > 900 || translateY.value > 140) {
        runOnJS(dismiss)();
      } else {
        translateY.value = withSpring(0, motion.spring);
        backdrop.value = withTiming(1, { duration: 150 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  const maxHeight = screenH * maxHeightRatio;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Cerrar" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[styles.sheet, fill ? { height: maxHeight } : { maxHeight }, { paddingBottom: (kb > 0 ? kb : insets.bottom) + spacing.lg }, sheetStyle]}
        >
          <GestureDetector gesture={pan}>
            <View style={styles.grabArea}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    ...shadows.lg,
  },
  grabArea: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md, minHeight: 28 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
});
