import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../components/ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUserStore } from '../state/userStore';
import { getUserReports } from '../services/supabase';
import { AccessCounter } from '../components/AccessCounter';
import { Badge } from '../components/ui/Badge';
import { LeaderboardSheet } from '../components/LeaderboardSheet';
import { FUEL_DISPLAY } from '../constants/fuelLabels';
import { useScalePress } from '../hooks/useScalePress';
import { colors, radius, spacing, typography } from '../theme';
import type { FuelType, UserReport } from '../types';

const getInitials = (name: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success' as const;
    case 'rejected': return 'danger' as const;
    case 'pending': return 'warning' as const;
    default: return 'neutral' as const;
  }
};

export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { profile, signOut, deleteAccount, status, updateDisplayName, updatePreferredFuel } = useUserStore();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const hasAnimated = useRef(false);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(16);
  const accessOpacity = useSharedValue(0);
  const accessTranslateY = useSharedValue(16);
  const statsOpacity = useSharedValue(0);
  const statsTranslateY = useSharedValue(16);
  const section1Opacity = useSharedValue(0);
  const section2Opacity = useSharedValue(0);
  const section3Opacity = useSharedValue(0);
  const section4Opacity = useSharedValue(0);
  const signOutOpacity = useSharedValue(0);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    headerOpacity.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    headerTranslateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });

    setTimeout(() => {
      accessOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      accessTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 150);

    setTimeout(() => {
      statsOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      statsTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 300);

    setTimeout(() => {
      section1Opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 450);

    setTimeout(() => {
      section2Opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 550);

    setTimeout(() => {
      section3Opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 650);

    setTimeout(() => {
      section4Opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 750);

    setTimeout(() => {
      signOutOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    }, 850);
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const accessStyle = useAnimatedStyle(() => ({
    opacity: accessOpacity.value,
    transform: [{ translateY: accessTranslateY.value }],
  }));

  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsTranslateY.value }],
  }));

  const section1Style = useAnimatedStyle(() => ({ opacity: section1Opacity.value }));
  const section2Style = useAnimatedStyle(() => ({ opacity: section2Opacity.value }));
  const section3Style = useAnimatedStyle(() => ({ opacity: section3Opacity.value }));
  const section4Style = useAnimatedStyle(() => ({ opacity: section4Opacity.value }));
  const signOutStyle = useAnimatedStyle(() => ({ opacity: signOutOpacity.value }));

  useEffect(() => {
    if (!profile) return;
    setReportsLoading(true);
    getUserReports(profile.id)
      .then(setReports)
      .catch(() => {})
      .finally(() => setReportsLoading(false));
  }, [profile]);

  const handleOpenNameEdit = useCallback(() => {
    setEditName(profile?.display_name ?? '');
    setShowNameModal(true);
  }, [profile]);

  const handleSaveName = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed || !profile) return;
    try {
      await updateDisplayName(trimmed);
      setShowNameModal(false);
    } catch (err) {
      console.error('[Profile] Failed to update name:', err);
    }
  }, [editName, profile, updateDisplayName]);

  const handlePreferredFuel = useCallback((fuel: FuelType | null) => {
    updatePreferredFuel(fuel);
  }, [updatePreferredFuel]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

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

  const openPrivacy = useCallback(() => {
    Linking.openURL(`${process.env.EXPO_PUBLIC_WEB_URL || 'https://via.siramong.qzz.io'}/privacy`).catch(() => {});
  }, []);

  const signOutScale = useScalePress(0.96);
  const accessOptionScale = useScalePress(0.97);
  const fuelOptionScale = useScalePress(0.95);

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }]}>
        {/* Header with avatar */}
        <Animated.View style={headerStyle}>
          <View style={styles.header}>
            <LinearGradient
              colors={['#034af8', '#4A7AF8']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials(profile.display_name)}</Text>
            </LinearGradient>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>Perfil</Text>
              <Pressable onPress={handleOpenNameEdit} style={styles.nameRow}>
                <Text style={styles.displayName}>{profile.display_name}</Text>
                <Ionicons name="pencil" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={accessStyle}>
          <AccessCounter remaining={profile.access_remaining} />
        </Animated.View>

        {/* Stats */}
        <Animated.View style={[styles.stats, statsStyle]}>
          <StatCard icon="shield-checkmark" label="Reputación" value={profile.reputation.toString()} />
          <StatCard icon="calendar" label="Registrado" value={formatDate(profile.created_at)} />
        </Animated.View>

        {/* Preferred Fuel */}
        <Animated.View style={[styles.section, section1Style]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Combustible preferido</Text>
          </View>
          <Text style={styles.bodyText}>
            Selecciona el tipo de combustible que usa tu vehículo. Las estaciones mostrarán primero los precios de tu combustible preferido.
          </Text>
          <Animated.View style={[styles.fuelOptions, fuelOptionScale.animatedStyle]}>
            {([null, 'ecopais', 'super', 'diesel'] as const).map((fuel) => {
              const selected = profile.preferred_fuel === fuel;
              const label = fuel ? FUEL_DISPLAY[fuel] : 'Todos';
              return (
                <Pressable
                  key={fuel ?? 'all'}
                  style={[styles.fuelOption, selected && styles.fuelOptionSelected]}
                  onPress={() => handlePreferredFuel(fuel)}
                  onPressIn={fuelOptionScale.onPressIn}
                  onPressOut={fuelOptionScale.onPressOut}
                >
                  <Text style={[styles.fuelOptionText, selected && styles.fuelOptionTextSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </Animated.View>

        {/* Contribution history */}
        <Animated.View style={[styles.section, section2Style]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Reportes recientes</Text>
          </View>
          {reportsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
          ) : reports.length === 0 ? (
            <Text style={styles.emptyText}>Sin reportes aún. ¡Envía tu primer precio!</Text>
          ) : (
            <View style={styles.reportList}>
              {reports.map((r) => (
                <View key={r.id} style={styles.reportItem}>
                  <View style={styles.reportMeta}>
                    <Text style={styles.reportStation} numberOfLines={1}>
                      {r.station_name ?? 'Estación desconocida'}
                    </Text>
                    <Text style={styles.reportDate}>{formatDate(r.created_at)}</Text>
                  </View>
                  <Badge variant={statusBadgeVariant(r.status)} label={
      r.status === 'approved' ? 'aprobado' :
      r.status === 'rejected' ? 'rechazado' :
      r.status === 'pending' ? 'pendiente' :
      r.status
    } />
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Get more access */}
        <Animated.View style={[styles.section, section3Style]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Obtener más accesos</Text>
          </View>
          <Text style={styles.bodyText}>
            Gana puntos de acceso contribuyendo precios verificados.
          </Text>
          <View style={styles.accessOptions}>
            <Animated.View style={accessOptionScale.animatedStyle}>
              <AccessOption
                icon="camera"
                title="Enviar un reporte"
                description="Gana 2 puntos de acceso por reporte verificado"
                onPress={() => {}}
              />
            </Animated.View>
          </View>
        </Animated.View>

        {/* How it works */}
        <Animated.View style={[styles.infoCard, section4Style]}>
          <View style={styles.infoHeader}>
            <Ionicons name="star" size={16} color={colors.primary} />
            <Text style={styles.infoTitle}>Cómo funciona</Text>
          </View>
          <Text style={styles.bodyText}>
            Comienzas con 3 vistas de mapa gratuitas. Cada vez que abres el mapa, se usa 1 punto de acceso.
          </Text>
          <Text style={styles.bodyText}>
            Contribuye precios verificados para recuperar accesos y aumentar tu reputación.
          </Text>
        </Animated.View>

        {/* Leaderboard */}
        <Animated.View style={[styles.leaderboardCard, section4Style]}>
          <Pressable onPress={() => setShowLeaderboard(true)} style={styles.leaderboardPress}>
            <View style={styles.leaderboardLeft}>
              <Ionicons name="trophy" size={18} color={colors.warning} />
              <View>
                <Text style={styles.leaderboardTitle}>Ranking de contribuidores</Text>
                <Text style={styles.leaderboardSub}>Los mejores según su reputación</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {/* Sign out */}
        <Animated.View style={[signOutScale.animatedStyle, signOutStyle]}>
          <Pressable style={styles.dangerButton} onPress={handleSignOut} onPressIn={signOutScale.onPressIn} onPressOut={signOutScale.onPressOut} disabled={status === 'loading'}>
            {status === 'loading' ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <>
                <Ionicons name="log-out" size={16} color={colors.danger} />
                <Text style={styles.dangerButtonText}>Cerrar sesión</Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        <Pressable style={styles.linkButton} onPress={openPrivacy} accessibilityRole="link" accessibilityLabel="Política de privacidad">
          <Text style={styles.linkButtonText}>Política de privacidad</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={handleDeleteAccount} accessibilityRole="button" accessibilityLabel="Eliminar cuenta">
          <Text style={[styles.linkButtonText, { color: colors.danger }]}>Eliminar cuenta</Text>
        </Pressable>
      </ScrollView>

      {showLeaderboard && profile && (
        <LeaderboardSheet currentUserId={profile.id} onClose={() => setShowLeaderboard(false)} />
      )}

      {/* Edit name modal */}
      <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => setShowNameModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowNameModal(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Editar nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowNameModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalSave} onPress={handleSaveName}>
                <LinearGradient colors={[colors.primary, colors.accent]} style={styles.modalSaveFill}>
                  <Text style={styles.modalSaveText}>Guardar</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

const StatCard = ({ icon, label, value }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={styles.statHeader}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

type AccessOptionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

const AccessOption = ({ icon, title, description, onPress }: AccessOptionProps) => (
  <Pressable style={styles.accessOption} onPress={onPress}>
    <View style={styles.accessIcon}>
      <Ionicons name={icon} size={18} color={colors.primary} />
    </View>
    <View style={styles.accessInfo}>
      <Text style={styles.accessTitle}>{title}</Text>
      <Text style={styles.accessDesc}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: '800',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  displayName: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  stats: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.xl,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  bodyText: {
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  reportList: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface1,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  reportMeta: {
    flex: 1,
    marginRight: spacing.sm,
  },
  reportStation: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  reportDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  accessOptions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  accessOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  accessIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessInfo: {
    flex: 1,
  },
  accessTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  accessDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  infoCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  fuelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
    fontSize: 12,
    fontWeight: '600',
  },
  fuelOptionTextSelected: {
    color: colors.accent,
  },
  linkButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtonText: {
    ...typography.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  dangerButton: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dangerButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.surface1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSave: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  modalSaveFill: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: colors.background,
    fontWeight: '700',
  },
  leaderboardCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.glass,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  leaderboardPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  leaderboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  leaderboardTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  leaderboardSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
