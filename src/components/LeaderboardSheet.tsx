import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Text } from './ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { colors, radius, spacing, typography } from '../theme';
import { Sheet } from './ui/Sheet';
import { Skeleton } from './ui/Skeleton';

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
  const [failed, setFailed] = useState(false);

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
      } catch {
        setFailed(true);
      }
      setLoading(false);
    })();
  }, [currentUserId]);

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
            {item.display_name ?? 'Usuario VIA'}
          </Text>
        </View>
        <View style={styles.repCol}>
          <Ionicons name="shield-checkmark" size={12} color={colors.accentSoft} />
          <Text style={styles.repText}>{item.reputation}</Text>
        </View>
      </View>
    );
  };

  return (
    <Sheet visible onClose={onClose} fill maxHeightRatio={0.75} accessibilityLabel="Ranking de contribuidores">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ranking</Text>
          <Text style={styles.subtitle}>Los que más aportan a la comunidad</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ gap: spacing.sm }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={44} radius={radius.sm} />
          ))}
        </View>
      ) : failed || entries.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>{failed ? 'No se pudo cargar el ranking' : 'Sin datos aún'}</Text>
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
    </Sheet>
  );
};

const styles = StyleSheet.create({
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
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
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
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  rowCurrent: {
    backgroundColor: 'rgba(74, 122, 248, 0.22)',
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
    color: colors.textPrimary,
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
