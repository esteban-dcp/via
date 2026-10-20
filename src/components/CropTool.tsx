import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { colors, spacing, typography } from '../theme';

const MIN_CROP = 72;
const HANDLE_HIT = 48;

type Props = {
  uri: string;
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
};

export const CropTool = ({ uri, onCrop, onCancel }: Props) => {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const availW = winW - spacing.lg * 2;
  const availH = winH - insets.top - insets.bottom - 230;
  const scale = natural ? Math.min(availW / natural.w, availH / natural.h) : 1;
  const dispW = natural ? natural.w * scale : availW;
  const dispH = natural ? natural.h * scale : availH;

  const top = useSharedValue(0);
  const height = useSharedValue(0);
  const startTop = useSharedValue(0);
  const startHeight = useSharedValue(0);

  useEffect(() => {
    Image.getSize(uri, (w, h) => setNatural({ w, h }), () => setNatural({ w: availW, h: availH }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  useEffect(() => {
    if (!natural) return;
    // Caja inicial centrada con ~40% de la altura: zona típica del display.
    const h = Math.max(MIN_CROP, dispH * 0.4);
    height.value = h;
    top.value = (dispH - h) / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, dispH]);

  const bodyPan = Gesture.Pan()
    .onBegin(() => { startTop.value = top.value; })
    .onChange((e) => {
      top.value = Math.max(0, Math.min(dispH - height.value, startTop.value + e.translationY));
    });

  const topPan = Gesture.Pan()
    .onBegin(() => { startTop.value = top.value; startHeight.value = height.value; })
    .onChange((e) => {
      const bottom = startTop.value + startHeight.value;
      const nextTop = Math.max(0, Math.min(bottom - MIN_CROP, startTop.value + e.translationY));
      top.value = nextTop;
      height.value = bottom - nextTop;
    });

  const bottomPan = Gesture.Pan()
    .onBegin(() => { startHeight.value = height.value; })
    .onChange((e) => {
      height.value = Math.max(MIN_CROP, Math.min(dispH - top.value, startHeight.value + e.translationY));
    });

  const boxStyle = useAnimatedStyle(() => ({ top: top.value, height: height.value }));
  const maskTop = useAnimatedStyle(() => ({ height: top.value }));
  const maskBottom = useAnimatedStyle(() => ({ top: top.value + height.value, bottom: 0 }));
  const topHandle = useAnimatedStyle(() => ({ top: top.value - HANDLE_HIT / 2 }));
  const bottomHandle = useAnimatedStyle(() => ({ top: top.value + height.value - HANDLE_HIT / 2 }));

  const confirm = async (full: boolean) => {
    if (!natural) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      if (full) {
        onCrop(uri);
        return;
      }
      const originY = Math.max(0, Math.round(top.value / scale));
      const cropH = Math.min(natural.h - originY, Math.round(height.value / scale));
      const result = await manipulateAsync(
        uri,
        [{ crop: { originX: 0, originY, width: natural.w, height: cropH } }],
        { compress: 0.8, format: SaveFormat.JPEG },
      );
      onCrop(result.uri);
    } catch {
      onCrop(uri);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GestureHandlerRootView style={[styles.container, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.header}>
        <IconButton icon="close" label="Cancelar recorte" onPress={onCancel} tone="ghost" />
        <Text style={styles.title}>Enfoca los precios</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.stage}>
        <View style={{ width: dispW, height: dispH }}>
          <Image source={{ uri }} style={{ width: dispW, height: dispH, borderRadius: 12 }} resizeMode="stretch" />
          <Animated.View pointerEvents="none" style={[styles.mask, { top: 0 }, maskTop]} />
          <Animated.View pointerEvents="none" style={[styles.mask, maskBottom]} />

          <GestureDetector gesture={bodyPan}>
            <Animated.View style={[styles.box, boxStyle]} accessibilityLabel="Zona de recorte, arrastra para mover">
              <View style={[styles.corner, { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.corner, { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 }]} />
              <View style={[styles.corner, { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.corner, { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 }]} />
            </Animated.View>
          </GestureDetector>

          <GestureDetector gesture={topPan}>
            <Animated.View style={[styles.handleHit, topHandle]} accessibilityLabel="Borde superior del recorte">
              <View style={styles.grip} />
            </Animated.View>
          </GestureDetector>
          <GestureDetector gesture={bottomPan}>
            <Animated.View style={[styles.handleHit, bottomHandle]} accessibilityLabel="Borde inferior del recorte">
              <View style={styles.grip} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      <Text style={styles.hint}>Arrastra los bordes para encuadrar solo el display del surtidor</Text>
      <View style={styles.footer}>
        <Button title="Foto completa" variant="secondary" onPress={() => confirm(true)} disabled={loading} style={{ flex: 1 }} />
        <Button title="Recortar" icon="crop" variant="primary" loading={loading} onPress={() => confirm(false)} style={{ flex: 1 }} />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h4, color: colors.textPrimary },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mask: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(1, 8, 36, 0.72)' },
  box: { position: 'absolute', left: 0, right: 0, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.accent },
  handleHit: { position: 'absolute', left: 0, right: 0, height: HANDLE_HIT, alignItems: 'center', justifyContent: 'center' },
  grip: { width: 56, height: 6, borderRadius: 3, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.onPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md },
  footer: { flexDirection: 'row', gap: spacing.md },
});
