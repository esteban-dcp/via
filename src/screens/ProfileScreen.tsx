import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, TextInput } from '../components/ui/Text';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Sheet } from '../components/ui/Sheet';
import { Skeleton } from '../components/ui/Skeleton';
import { useUserStore } from '../state/userStore';
import { toast } from '../state/toastStore';
import { getUserReports } from '../services/supabase';
import { AccessCounter } from '../components/AccessCounter';
import { LeaderboardSheet } from '../components/LeaderboardSheet';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { colors, fonts, motion, radius, spacing, typography } from '../theme';
import type { FuelType, UserReport } from '../types';

const getInitials = (name: string | null): string => {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const STATUS: Record<string, { variant: 'success' | 'danger' | 'warning' | 'neutral'; label: string }> = {
  approved: { variant: 'success', label: 'Aprobado' },
  rejected: { variant: 'danger', label: 'Rechazado' },
  pending: { variant: 'warning', label: 'En revisión' },
};

const FUEL_OPTIONS = [null, 'ecopais', 'super', 'diesel'] as const;
const enter = (i: number) => FadeInDown.delay(i * motion.stagger * 1.5).springify().damping(20).stiffness(180);

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const profile = useUserStore((s) => s.profile);
  const status = useUserStore((s) => s.status);
  const signOut = useUserStore((s) => s.signOut);
  const deleteAccount = useUserStore((s) => s.deleteAccount);
  const updateDisplayName = useUserStore((s) => s.updateDisplayName);
  const updatePreferredFuel = useUserStore((s) => s.updatePreferredFuel);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const profileId = profile?.id;
  useEffect(() => {
    if (!profileId) return;
    setReportsLoading(true);
    getUserReports(profileId)
      .then(setReports)
      .catch(() => toast.error('No se pudieron cargar tus reportes'))
      .finally(() => setReportsLoading(false));
  }, [profileId]);

  const handleOpenNameEdit = useCallback(() => {
    setEditName(profile?.display_name ?? '');
    setShowNameModal(true);
  }, [profile?.display_name]);

  const handleSaveName = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed || !profile) return;
    setSavingName(true);
    try {
      await updateDisplayName(trimmed);
      setShowNameModal(false);
    } catch {
      toast.error('No se pudo guardar tu nombre');
    } finally {
      setSavingName(false);
    }
  }, [editName, profile, updateDisplayName]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Eliminar cuenta',
      'Se borrarán tu perfil, favoritos y reputación. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch {
              Alert.alert('No se pudo eliminar la cuenta', 'Inténtalo de nuevo más tarde.');
            }
          },
        },
      ],
    );
  }, [deleteAccount]);

  const webBase = process.env.EXPO_PUBLIC_WEB_URL || 'https://via.siramong.qzz.io';
  const openUrl = useCallback((url: string) => Linking.openURL(url).catch(() => toast.error('No se pudo abrir el enlace')), []);

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['rgba(3,74,248,0.28)', 'transparent']} style={styles.topGlow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={enter(0)} style={styles.header}>
          <LinearGradient colors={[colors.primary, colors.accent]} style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile.display_name)}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.displayName} numberOfLines={1}>{profile.display_name ?? 'Sin nombre'}</Text>
            <Pressable
              onPress={handleOpenNameEdit}
              style={styles.editRow}
              accessibilityRole="button"
              accessibilityLabel="Editar nombre"
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 24 }}
            >
              <Ionicons name="pencil" size={13} color={colors.accentSoft} />
              <Text style={styles.editText}>Editar nombre</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={enter(1)} style={styles.statsRow}>
          <View style={{ flex: 1 }}>
            <AccessCounter remaining={profile.access_remaining} />
          </View>
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Ionicons name="shield-checkmark" size={15} color={colors.accentSoft} />
              <Text style={styles.statLabel}>Reputación</Text>
            </View>
            <Text style={styles.statValue}>{profile.reputation}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={enter(2)} style={styles.section}>
          <SectionTitle icon="water" title="Combustible preferido" />
          <Text style={styles.bodyText}>Verás primero los precios de tu combustible.</Text>
          <View style={styles.fuelOptions} accessibilityRole="radiogroup">
            {FUEL_OPTIONS.map((fuel) => {
              const selected = profile.preferred_fuel === fuel;
              const label = fuel ? FUEL_DISPLAY[fuel as FuelType] : 'Todos';
              return (
                <Pressable
                  key={fuel ?? 'all'}
                  style={[styles.fuelOption, selected && styles.fuelOptionSelected]}
                  onPress={() => updatePreferredFuel(fuel)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.fuelOptionText, selected && styles.fuelOptionTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={enter(3)} style={styles.section}>
          <SectionTitle icon="time" title="Tus reportes" />
          {reportsLoading ? (
            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <Skeleton height={44} />
              <Skeleton height={44} />
            </View>
          ) : reports.length === 0 ? (
            <View style={styles.emptyReports}>
              <Text style={styles.bodyText}>Aún no has reportado precios. Cada reporte aprobado te da accesos.</Text>
              <Button title="Enviar mi primer precio" icon="camera" size="sm" onPress={() => navigation.navigate('Contribute')} style={{ marginTop: spacing.md }} />
            </View>
          ) : (
            <View style={styles.reportList}>
              {reports.map((r, i) => {
                const st = STATUS[r.status] ?? { variant: 'neutral' as const, label: r.status };
                return (
                  <View key={r.id} style={[styles.reportItem, i > 0 && styles.reportDivider]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportStation} numberOfLines={1}>{r.station_name ?? 'Estación sin nombre'}</Text>
                      <Text style={styles.reportDate}>{formatDate(r.created_at)}</Text>
                    </View>
                    <Badge variant={st.variant} label={st.label} />
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={enter(4)} style={styles.section}>
          <SectionTitle icon="sparkles" title="Cómo funciona" />
          <Text style={styles.bodyText}>
            Empiezas con 3 accesos gratuitos al mapa; cada apertura usa uno. Reporta precios verificados para ganar +2 accesos y subir tu reputación.
          </Text>
        </Animated.View>

        <Animated.View entering={enter(5)} style={styles.list}>
          <ListRow icon="trophy" iconColor={colors.warning} title="Ranking de contribuidores" subtitle="Quién aporta más a la comunidad" onPress={() => setShowLeaderboard(true)} />
          <ListRow icon="information-circle" title="Acerca de VIA" subtitle="Versión y atribuciones del mapa" onPress={() => setShowAbout(true)} />
          <ListRow icon="shield-checkmark" title="Política de privacidad" onPress={() => openUrl(`${webBase}/privacy`)} />
        </Animated.View>

        <Animated.View entering={enter(6)} style={styles.dangerZone}>
          <Button title="Cerrar sesión" variant="secondary" icon="log-out-outline" loading={status === 'loading'} onPress={signOut} />
          <Pressable style={styles.deleteLink} onPress={handleDeleteAccount} accessibilityRole="button" accessibilityLabel="Eliminar cuenta">
            <Text style={styles.deleteText}>Eliminar mi cuenta</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {showLeaderboard && <LeaderboardSheet currentUserId={profile.id} onClose={() => setShowLeaderboard(false)} />}

      <Sheet visible={showNameModal} onClose={() => setShowNameModal(false)} accessibilityLabel="Editar nombre">
        <Text style={styles.sheetTitle}>Editar nombre</Text>
        <TextInput
          style={styles.input}
          value={editName}
          onChangeText={setEditName}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textMuted}
          maxLength={40}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleSaveName}
          accessibilityLabel="Nombre"
        />
        <View style={styles.sheetActions}>
          <Button title="Cancelar" variant="secondary" onPress={() => setShowNameModal(false)} style={{ flex: 1 }} />
          <Button title="Guardar" loading={savingName} disabled={!editName.trim()} onPress={handleSaveName} style={{ flex: 1 }} />
        </View>
      </Sheet>

      <Sheet visible={showAbout} onClose={() => setShowAbout(false)} accessibilityLabel="Acerca de VIA">
        <Text style={styles.sheetTitle}>VIA</Text>
        <Text style={styles.bodyText}>Precios de combustible de Ecuador, reportados por conductores como tú.</Text>
        <View style={styles.attribution}>
          <Text style={styles.attrTitle}>Mapa</Text>
          <Text style={styles.attrText}>© OpenStreetMap contributors · © CARTO · Leaflet</Text>
        </View>
        <Button title="Ver términos de uso" variant="secondary" icon="document-text-outline" onPress={() => openUrl(`${webBase}/terms`)} style={{ marginTop: spacing.md }} />
      </Sheet>
    </View>
  );
};

const SectionTitle = ({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={16} color={colors.accentSoft} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

type ListRowProps = { icon: keyof typeof Ionicons.glyphMap; iconColor?: string; title: string; subtitle?: string; onPress: () => void };

const ListRow = ({ icon, iconColor = colors.accentSoft, title, subtitle, onPress }: ListRowProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: colors.surface2 }]}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={styles.listIcon}>
      <Ionicons name={icon} size={18} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.listTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.listSub}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.onPrimary },
  displayName: { ...typography.h2, color: colors.textPrimary },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, minHeight: 28 },
  editText: { ...typography.captionBold, color: colors.accentSoft },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  statLabel: { ...typography.label, color: colors.textSecondary },
  statValue: { fontFamily: fonts.extrabold, fontSize: 36, letterSpacing: -1, color: colors.textPrimary },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sectionTitle: { ...typography.h4, color: colors.textPrimary },
  bodyText: { ...typography.body, color: colors.textSecondary },
  fuelOptions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  fuelOption: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surface3, borderWidth: 1, borderColor: colors.border },
  fuelOptionSelected: { backgroundColor: colors.primary, borderColor: colors.accent },
  fuelOptionText: { ...typography.captionBold, color: colors.textSecondary, letterSpacing: 0.4 },
  fuelOptionTextSelected: { color: colors.onPrimary },
  emptyReports: { marginTop: spacing.xs },
  reportList: { marginTop: spacing.sm },
  reportItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 },
  reportDivider: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  reportStation: { ...typography.bodyBold, color: colors.textPrimary },
  reportDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, paddingHorizontal: spacing.md },
  listIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center' },
  listTitle: { ...typography.bodyBold, color: colors.textPrimary },
  listSub: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
  dangerZone: { marginTop: spacing.md, gap: spacing.sm },
  deleteLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteText: { ...typography.bodyBold, color: colors.danger },
  sheetTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
  input: { minHeight: 52, borderRadius: radius.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface3, borderWidth: 1.5, borderColor: colors.accent, color: colors.textPrimary, fontFamily: fonts.medium, fontSize: 16 },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  attribution: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface3 },
  attrTitle: { ...typography.label, color: colors.textSecondary },
  attrText: { ...typography.caption, color: colors.textPrimary, marginTop: 4 },
});
