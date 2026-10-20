import { useRef, useState } from 'react';
import { Dimensions, Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { colors, radius, spacing, typography } from '../theme';
import { Button } from './ui/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_WIDTH * 1.2;
const CROP_H = PREVIEW_HEIGHT * 0.35;

type Props = {
  uri: string;
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
};

export const CropTool = ({ uri, onCrop, onCancel }: Props) => {
  const [loading, setLoading] = useState(false);
  const cropY = useSharedValue(0);
  const startY = useRef(0);
  const imageLayout = useRef({ x: 0, y: 0, width: SCREEN_WIDTH, height: PREVIEW_HEIGHT });

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        startY.current = cropY.value;
      },
      onPanResponderMove: (_, gs) => {
        const next = startY.current + gs.dy;
        const maxY = imageLayout.current.height - CROP_H;
        cropY.value = Math.max(0, Math.min(maxY, next));
      },
      onPanResponderRelease: () => {
        cropY.value = withTiming(cropY.value, { duration: 100 });
      },
    }),
  ).current;

  const windowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cropY.value }],
  }));

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { width: imgW, height: imgH } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(
          uri,
          (w, h) => resolve({ width: w, height: h }),
          reject,
        );
      });

      const scaleX = imgW / imageLayout.current.width;
      const scaleY = imgH / imageLayout.current.height;
      const cropX = 0;
      const cropW = imageLayout.current.width * scaleX;
      const cropH = CROP_H * scaleY;
      const cropOriginY = cropY.value * scaleY;

      const result = await manipulateAsync(
        uri,
        [{ crop: { originX: cropX, originY: cropOriginY, width: cropW, height: cropH } }],
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.title}>Ajustar recorte</Text>
        <View style={{ width: 32 }} />
      </View>

      <View
        style={styles.imageWrap}
        onLayout={(e) => {
          e.target.measureInWindow((x, y) => {
            imageLayout.current = { x, y, width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
          });
        }}
      >
        <Image source={{ uri }} style={styles.image} />
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[styles.mask, { height: cropY.value ?? 0 }]} />
          <Animated.View
            style={[styles.cropWindow, windowStyle]}
            {...pan.panHandlers}
          >
            <View style={styles.guide}>
              <Ionicons name="move" size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.maskBottom,
              { top: cropY.value ?? 0 },
            ]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>
          Arrastra hacia arriba o abajo para enfocar la zona de precios
        </Text>
        <Button
          title="Aplicar recorte"
          icon="crop"
          variant="primary"
          loading={loading}
          onPress={handleConfirm}
          size="lg"
        />
      </View>
    </View>
  );
};

const MASK_OPACITY = 'rgba(1,19,96,0.7)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  imageWrap: {
    width: SCREEN_WIDTH,
    height: PREVIEW_HEIGHT,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  mask: {
    backgroundColor: MASK_OPACITY,
    width: '100%',
  },
  maskBottom: {
    backgroundColor: MASK_OPACITY,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  cropWindow: {
    height: CROP_H,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  guide: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
