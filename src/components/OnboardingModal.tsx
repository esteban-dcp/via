import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../state/userStore';
import { Button } from './ui/Button';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { colors, radius, spacing, typography } from '../theme';
import type { FuelType } from '../types';

const FUEL_OPTIONS: { value: FuelType | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'ecopais', label: FUEL_DISPLAY.ecopais },
  { value: 'super', label: FUEL_DISPLAY.super },
  { value: 'diesel', label: FUEL_DISPLAY.diesel },
];

type Props = {
  visible: boolean;
  onComplete: () => void;
};

export const OnboardingModal = ({ visible, onComplete }: Props) => {
  const { profile, updateDisplayName, updatePreferredFuel } = useUserStore();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [preferredFuel, setPreferredFuel] = useState<FuelType | null>(profile?.preferred_fuel ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!displayName.trim()) {
      setError('Ingresa tu nombre para continuar');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateDisplayName(displayName.trim());
      await updatePreferredFuel(preferredFuel);
      onComplete();
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(11, 16, 32, 0.95)', 'rgba(18, 26, 46, 0.98)']}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(76, 201, 240, 0.05)', 'transparent']}
          style={[StyleSheet.absoluteFill, { top: 0, height: '40%' }]}
          pointerEvents="none"
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>1 de 1</Text>
            </View>
            <Text style={styles.title}>Bienvenido a VIA</Text>
            <Text style={styles.subtitle}>
              Personaliza tu experiencia para encontrar los mejores precios cerca de ti.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tu nombre</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Ej: Juan Pérez"
                placeholderTextColor={colors.textMuted}
                autoFocus
                editable={!saving}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Combustible preferido</Text>
            <Text style={styles.hint}>¿Qué tipo de combustible usa tu vehículo?</Text>
            <View style={styles.fuelOptions}>
              {FUEL_OPTIONS.map((opt) => {
                const selected = preferredFuel === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    style={[styles.fuelOption, selected && styles.fuelOptionSelected]}
                    onPress={() => setPreferredFuel(opt.value)}
                  >
                    <Text style={[styles.fuelOptionText, selected && styles.fuelOptionTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!!error && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title="Comenzar"
            icon="arrow-forward"
            onPress={handleComplete}
            loading={saving}
            disabled={saving}
            size="lg"
            style={{ marginTop: spacing.xl }}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stepBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  stepText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  fuelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fuelOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fuelOptionSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  fuelOptionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  fuelOptionTextSelected: {
    color: colors.accent,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 92, 92, 0.25)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
});
