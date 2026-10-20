import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { colors, radius, shadows, spacing, typography } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.7;

type LeaderboardEntry = {
  rank: number;
  display_name: string | null;
  reputation: number;
  isCurrentUser: boolean;
};

type Props = {
  currentUserId: string;
  onClose: () => void;
};

const MEDAL_ICONS: Record<number, keyof typeof Ionicons.glyphMap> = {
  1: 'medal',
  2: 'medal',
  3: 'medal',
};

const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

export const LeaderboardSheet = ({ currentUserId, onClose }: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
    backdropOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('public_profiles')
          .select('id, display_name, reputation')
          .order('reputation', { ascending: false })
          .limit(50);
        if (error) throw error;
        const list: LeaderboardEntry[] = (data ?? []).map((u: any, i: number) => ({
          rank: i + 1,
          display_name: u.display_name,
          reputation: u.reputation,
          isCurrentUser: u.id === currentUserId,
        }));
        setEntries(list);
      } catch {}
      setLoading(false);
    })();
  }, [currentUserId]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const handleClose = useCallback(() => {
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 250, easing: Easing.out(Easing.quad) });
    backdropOpacity.value = withTiming(0, { duration: 150 });
    setTimeout(onClose, 200);
  }, [onClose]);

  const renderItem = ({ item }: { item: LeaderboardEntry }) => {
    const isTop3 = item.rank <= 3;
    const medalIcon = isTop3 ? MEDAL_ICONS[item.rank] : null;
    const medalColor = isTop3 ? MEDAL_COLORS[item.rank] : undefined;

    return (
      <View style={[styles.row, item.isCurrentUser && styles.rowCurrent]}>
        <View style={styles.rankCol}>
          {isTop3 ? (
            <Ionicons name={medalIcon!} size={18} color={medalColor} />
          ) : (
            <Text style={styles.rankText}>#{item.rank}</Text>
          )}
        </View>
        <View style={styles.nameCol}>
          <Text style={[styles.name, item.isCurrentUser && styles.nameCurrent]} numberOfLines={1}>
            {item.display_name ?? 'VIA User'}
          </Text>
        </View>
        <View style={styles.repCol}>
          <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
          <Text style={styles.repText}>{item.reputation}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.wrapper} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Ranking de contribuidores</Text>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.emptyText}>Sin datos aún</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              renderItem={renderItem}
              keyExtractor={(item) => `${item.rank}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  rowCurrent: {
    backgroundColor: colors.primaryLight,
  },
  rankCol: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  nameCol: {
    flex: 1,
  },
  name: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  nameCurrent: {
    color: colors.primary,
  },
  repCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
