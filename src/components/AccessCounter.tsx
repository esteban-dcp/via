import { StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

type Props = {
  remaining: number;
};

export const AccessCounter = ({ remaining }: Props) => {
  const tone = remaining === 0 ? colors.danger : remaining <= 1 ? colors.warning : colors.success;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone}22` }]}>
          <Ionicons name="key" size={16} color={tone} />
        </View>
        <Text style={styles.label} numberOfLines={1}>Accesos</Text>
      </View>
      <Text style={[styles.value, { color: tone }]}>{remaining}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  row: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
