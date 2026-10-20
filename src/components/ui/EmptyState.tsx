import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { colors, spacing, typography } from '../../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
};

export const EmptyState = ({ icon, title, message, actionLabel, onAction, tone = 'neutral' }: Props) => (
  <View style={styles.wrap} accessibilityRole="summary">
    <View style={[styles.icon, tone === 'danger' && { backgroundColor: colors.dangerLight }]}>
      <Ionicons name={icon} size={26} color={tone === 'danger' ? colors.danger : colors.accentSoft} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
    {actionLabel && onAction && (
      <Button title={actionLabel} variant="secondary" size="sm" onPress={onAction} style={{ marginTop: spacing.md }} />
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
});
