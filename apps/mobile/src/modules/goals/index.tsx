import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { goalsClient } from '@/api/goals';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';

import { formatGoalAmount } from './format';

type Goal = {
  id: string;
  title: string;
  description?: string | null;
  currency: string;
  targetAmount: number;
  savedAmount: number;
  progress?: number;
  group?: { name: string };
};
export default function GoalsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const isProduction = process.env.NODE_ENV === 'production';
  const goalsQuery = useInfiniteQuery({
    queryKey: ['goals-list', search.trim()],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await goalsClient.index.$get({
        query: {
          limit: '50',
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      if (!response.ok) throw new Error('goals_load_failed');
      return (await response.json()) as unknown as {
        data: Goal[];
        pagination?: { nextCursor?: string | null };
      };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
  });
  const goals = goalsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={goalsQuery.isRefetching}
            onRefresh={() => void goalsQuery.refetch()}
          />
        }
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 160 &&
            goalsQuery.hasNextPage &&
            !goalsQuery.isFetchingNextPage
          ) {
            void goalsQuery.fetchNextPage();
          }
        }}
      >
        <Text style={styles.heading}>{t('goals.title')}</Text>
        <Card style={styles.notice}>
          <Text style={styles.noticeText}>{t('goals.notice')}</Text>
        </Card>
        <Button
          onPress={() =>
            router.push({
              pathname: '/goals/new',
              params: { from: 'goals' },
            } as never)
          }
        >
          <Text style={styles.buttonText}>＋ {t('goals.createNew')}</Text>
        </Button>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={t('goals.searchPlaceholder')}
          style={styles.search}
        />
        {goalsQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : goalsQuery.isError ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>{t('goals.loadError')}</Text>
            <Button onPress={() => void goalsQuery.refetch()}>
              <Text style={styles.buttonText}>{t('common.retry')}</Text>
            </Button>
          </Card>
        ) : goals.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>{t('goals.emptyTitle')}</Text>
            <Text style={styles.copy}>{t('goals.emptyCopy')}</Text>
            <Button
              onPress={() =>
                router.push({
                  pathname: '/goals/new',
                  params: { from: 'goals' },
                } as never)
              }
            >
              <Text style={styles.buttonText}>{t('goals.createNew')}</Text>
            </Button>
          </Card>
        ) : (
          goals.map((goal) => {
            const progress = Math.max(
              0,
              Math.min(
                100,
                goal.progress ?? (goal.savedAmount / goal.targetAmount) * 100,
              ),
            );
            return (
              <Card key={goal.id} style={styles.card}>
                <Text style={styles.title}>{goal.title}</Text>
                {goal.group?.name ? (
                  <Text style={styles.copy}>{goal.group.name}</Text>
                ) : null}
                <Text style={styles.copy}>
                  {goal.description ||
                    `${formatGoalAmount(goal.savedAmount, goal.currency)} de ${formatGoalAmount(goal.targetAmount, goal.currency)}`}
                </Text>
                <Progress value={progress} />
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: '/goals/[id]',
                      params: { id: goal.id, from: 'goals' },
                    } as never)
                  }
                >
                  <Text style={styles.link}>{t('common.viewAll')}</Text>
                </Button>
              </Card>
            );
          })
        )}
        {goalsQuery.isFetchingNextPage ? <Spinner color="#DE034D" /> : null}
        {goalsQuery.data && !goalsQuery.hasNextPage && goals.length > 0 ? (
          <Text style={styles.noMore}>{t('goals.noMore')}</Text>
        ) : null}
      </ScrollView>
      <Modal visible={isProduction} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonLabel}>{t('goals.comingSoon')}</Text>
            <Text style={styles.comingSoonTitle}>
              {t('goals.buildingTitle')}
            </Text>
            <Text style={styles.comingSoonCopy}>{t('goals.buildingCopy')}</Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  heading: { color: '#0F172A', fontSize: 30, fontWeight: '600' },
  notice: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', padding: 10 },
  noticeText: { color: '#9A3412', fontSize: 12, fontWeight: '500' },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  comingSoonCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    gap: 8,
    maxWidth: 320,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    width: '100%',
  },
  comingSoonLabel: {
    color: '#DE034D',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  comingSoonTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  comingSoonCopy: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  search: { backgroundColor: '#FFFFFF', borderRadius: 24, height: 44 },
  card: { gap: 10, padding: 18 },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  title: { color: '#0F172A', fontSize: 17, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  link: { color: '#DE034D', fontSize: 13, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  noMore: { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
});
