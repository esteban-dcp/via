import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  uri: string;
  onRetake?: () => void;
};

export const PhotoPreview = ({ uri, onRetake }: Props) => (
  <View style={styles.container}>
    <View style={styles.imageWrap}>
      <Image source={{ uri }} style={styles.image} />
      <View style={styles.badge}>
        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        <Text style={styles.badgeText}>Foto capturada</Text>
      </View>
    </View>
    {onRetake && (
      <Pressable style={styles.retake} onPress={onRetake} accessibilityRole="button" accessibilityLabel="Repetir foto">
        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
        <Text style={styles.retakeText}>Repetir</Text>
      </Pressable>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.success,
  },
  retake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    backgroundColor: colors.surface1,
  },
  retakeText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
});
