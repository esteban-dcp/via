import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { Button } from './ui/Button';

type Props = {
  visible: boolean;
  onAdComplete: () => void;
  onDismiss: () => void;
};

export const AdWall = ({ visible, onAdComplete, onDismiss }: Props) => {
  const [watching, setWatching] = useState(false);

  const handleWatchAd = useCallback(async () => {
    setWatching(true);
    try {
      // Test ID de Google para Android: ca-app-pub-3940256099942544/5224354917
      // Reemplazar con tu ID real cuando publiques:
      // import { RewardedAd, AdEventType } from 'react-native-google-mobile-ads';
      // const rewarded = RewardedAd.createForAdRequest('ca-app-pub-xxx/yyy');
      // rewarded.load();
      // rewarded.show();
      // rewarded.onAdEvent((type) => { if (type === AdEventType.EARNED_REWARD) onAdComplete(); });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onAdComplete();
    } finally {
      setWatching(false);
    }
  }, [onAdComplete]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable onPress={onDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.iconWrap}>
            <Ionicons name="play-circle" size={40} color={colors.primary} />
          </View>

          <Text style={styles.title}>Ver anuncio para descubrir</Text>
          <Text style={styles.subtitle}>
            Te has quedado sin accesos. Mira un video rápido y obtén 1 acceso gratis para ver el precio completo.
          </Text>

          <Button
            title={watching ? 'Cargando...' : 'Ver video (1 acceso)'}
            icon="play"
            variant="primary"
            loading={watching}
            onPress={handleWatchAd}
            size="lg"
            style={{ marginTop: spacing.lg, width: '100%' }}
          />

          <Pressable onPress={onDismiss} style={styles.skipBtn} disabled={watching}>
            <Text style={styles.skipText}>Ahora no</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  skipBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
