import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useLocationStore } from '../../state/locationStore';
import { colors, fonts, radius, spacing } from '../../theme';

type Props = { style?: object };

/** Aviso cuando usamos un punto guardado o no hay GPS/permiso. No se muestra con fix en vivo. */
export const LocationBanner = ({ style }: Props) => {
  const source = useLocationStore((s) => s.source);
  const errorCode = useLocationStore((s) => s.errorCode);
  const status = useLocationStore((s) => s.status);
  const retry = useLocationStore((s) => s.startWatching);

  if (source === 'live' && !errorCode) return null;
  if (!errorCode && status !== 'error') return null;

  const denied = errorCode === 'denied';
  const message = denied
    ? 'Sin permiso de ubicación. Mostramos el último punto conocido.'
    : errorCode === 'services_off'
      ? 'GPS desactivado. Mostramos el último punto conocido.'
      : 'Ubicación aproximada. No pudimos obtener tu posición actual.';
  const action = denied ? 'Ajustes' : errorCode === 'services_off' ? 'Activar' : 'Reintentar';

  const onPress = () => {
    if (denied || errorCode === 'services_off') {
      (Platform.OS === 'android' && errorCode === 'services_off'
        ? Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
        : Linking.openSettings()
      ).catch(() => Linking.openSettings().catch(() => {}));
    } else {
      void retry();
    }
  };

  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <Ionicons name="locate-outline" size={18} color={colors.warning} />
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={action} style={styles.action} hitSlop={6}>
        <Text style={styles.actionText}>{action}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  text: { flex: 1, flexShrink: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textPrimary },
  action: { minHeight: 40, paddingHorizontal: spacing.sm, justifyContent: 'center' },
  actionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.warning },
});
