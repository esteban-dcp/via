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
    <View style={[styles.container, { borderColor: tone }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${tone}22` }]}>
          <Ionicons name="key" size={16} color={tone} />
        </View>
        <Text style={styles.label}>Accesos restantes</Text>
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
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  row: {
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
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
});
