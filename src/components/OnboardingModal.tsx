import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutLeft, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, TextInput } from './ui/Text';
import { Button } from './ui/Button';
import { useUserStore } from '../state/userStore';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { colors, fonts, motion, radius, spacing, typography } from '../theme';
import type { FuelType } from '../types';

const FUEL_OPTIONS: { value: FuelType | null; label: string; hint: string }[] = [
  { value: 'ecopais', label: FUEL_DISPLAY.ecopais, hint: 'Gasolina extra / Ecopaís' },
  { value: 'super', label: FUEL_DISPLAY.super, hint: 'Gasolina súper' },
  { value: 'diesel', label: FUEL_DISPLAY.diesel, hint: 'Diésel' },
  { value: null, label: 'Todos', hint: 'Mostrar todos los combustibles' },
];

type Props = {
  visible: boolean;
  onComplete: () => void;
};

const ProgressBar = ({ step }: { step: number }) => {
  const style = useAnimatedStyle(() => ({ width: withSpring(`${((step + 1) / 2) * 100}%` as any, motion.spring) }));
  return (
    <View style={styles.track} accessible accessibilityLabel={`Paso ${step + 1} de 2`}>
      <Animated.View style={[styles.fill, style]} />
    </View>
  );
};

export const OnboardingModal = ({ visible, onComplete }: Props) => {
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);
  const updateDisplayName = useUserStore((s) => s.updateDisplayName);
  const updatePreferredFuel = useUserStore((s) => s.updatePreferredFuel);
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [preferredFuel, setPreferredFuel] = useState<FuelType | null>(profile?.preferred_fuel ?? null);
  const [fuelPicked, setFuelPicked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (!displayName.trim()) {
      setError('Escribe tu nombre para continuar');
      return;
    }
    setError(null);
    setStep(1);
  };

  const handleComplete = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateDisplayName(displayName.trim());
      await updatePreferredFuel(preferredFuel);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onComplete();
    } catch {
      setError('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.top}>
          <ProgressBar step={step} />
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="pricetag" size={16} color={colors.onPrimary} />
            </View>
            <Text style={styles.brand}>VIA</Text>
          </View>
        </View>

        {step === 0 ? (
          <Animated.View key="name" entering={FadeInDown.springify().damping(20)} exiting={FadeOutLeft.duration(160)} style={styles.body}>
            <Text style={styles.title}>Bienvenido.{'\n'}¿Cómo te llamamos?</Text>
            <Text style={styles.subtitle}>Así te verá la comunidad en el ranking.</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Tu nombre"
                placeholderTextColor={colors.textMuted}
                maxLength={40}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={next}
                accessibilityLabel="Tu nombre"
              />
            </View>
          </Animated.View>
        ) : (
          <Animated.View key="fuel" entering={FadeInDown.springify().damping(20)} style={styles.body}>
            <Text style={styles.title}>¿Qué combustible{'\n'}usas?</Text>
            <Text style={styles.subtitle}>Te mostraremos primero sus precios. Puedes cambiarlo luego.</Text>
            <View style={styles.options}>
              {FUEL_OPTIONS.map((opt) => {
                const selected = fuelPicked && preferredFuel === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setPreferredFuel(opt.value);
                      setFuelPicked(true);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${opt.label}. ${opt.hint}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.optionHint}>{opt.hint}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioOn]}>
                      {selected && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        )}

        <View>
          {!!error && (
            <View style={styles.errorCard} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          <View style={styles.actions}>
            {step === 1 && <Button title="Atrás" variant="secondary" onPress={() => setStep(0)} disabled={saving} style={{ flex: 1 }} />}
            <Button
              title={step === 0 ? 'Continuar' : 'Comenzar'}
              icon="arrow-forward"
              size="lg"
              loading={saving}
              disabled={step === 1 && !fuelPicked}
              onPress={step === 0 ? next : handleComplete}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  top: { gap: spacing.lg },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.surface3, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: 2, color: colors.textPrimary },
  body: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { ...typography.display, fontSize: 36, lineHeight: 42, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  input: { flex: 1, color: colors.textPrimary, fontFamily: fonts.semibold, fontSize: 18, paddingVertical: 12 },
  options: { gap: spacing.sm, marginTop: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  optionSelected: { borderColor: colors.accent, backgroundColor: 'rgba(74,122,248,0.18)' },
  optionLabel: { ...typography.bodyBold, color: colors.textPrimary, letterSpacing: 0.5 },
  optionHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.accent },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.dangerLight, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.md },
});
