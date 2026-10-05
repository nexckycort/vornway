import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useMinimizeOnScroll } from 'expo-glass-tabs';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';
import { useI18n } from '@/lib/i18n';

import { ActionCard, HomeSection } from './components/home-card';
import { DebtCard, ExpenseCard, GoalCard } from './components/summary-cards';
import { TripCard } from './components/trip-card';
import { useHomeData } from './hooks/use-home-data';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { data, error, isLoading, reload } = useHomeData();
  const onScroll = useMinimizeOnScroll();
  const { data: session } = authClient.useSession();
  const userName = useMemo(
    () =>
      (
        session as { user?: { name?: string | null } } | null
      )?.user?.name?.trim() || t('home.fallbackUser'),
    [session, t],
  );
  const hasGroups = (data?.trips.length ?? 0) > 0;

  if (isLoading && !data) {
    return (
      <View style={styles.loading}>
        <Spinner color="#DE034D" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void reload()}
            tintColor="#DE034D"
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {t('home.greeting')} <Text style={styles.name}>{userName}</Text>
            </Text>
            <Text style={styles.welcome}>{t('home.welcome')}</Text>
          </View>
          <Button
            accessibilityLabel={t('home.notificationsAria')}
            onPress={() => router.push('/notifications' as never)}
            size="icon"
            variant="ghost"
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={21} color="#202124" />
            {(data?.unreadNotifications ?? 0) > 0 ? (
              <View style={styles.dot} />
            ) : null}
          </Button>
        </View>

        <View style={styles.actions}>
          <ActionCard
            icon="compass-outline"
            title={t('home.createNewGroup')}
            onPress={() =>
              router.push({
                pathname: '/groups/new',
                params: { from: 'home' },
              } as never)
            }
          />
          <ActionCard
            icon="arrow-up-outline"
            title={t('home.createExpense')}
            primary
            onPress={() =>
              router.push({
                pathname: '/expenses/new',
                params: { from: 'home' },
              } as never)
            }
          />
        </View>

        {error ? (
          <Button
            onPress={() => void reload()}
            variant="ghost"
            style={styles.error}
          >
            <Text style={styles.errorText}>{error}. Toca para reintentar.</Text>
          </Button>
        ) : null}

        {!hasGroups ? (
          <EmptyState
            onPress={() =>
              router.push({
                pathname: '/groups/new',
                params: { from: 'home' },
              } as never)
            }
          />
        ) : (
          <>
            {data && data.expenses.length > 0 ? (
              <HomeSection
                title={t('home.recentExpenses')}
                onViewAll={() => router.push('/expenses/friends' as never)}
              >
                <View style={styles.stack}>
                  {data.expenses.map((item) => (
                    <ExpenseCard
                      key={item.id}
                      item={item}
                      onPress={() =>
                        router.push({
                          pathname:
                            '/expenses/friends/[quickSplitId]/[expenseId]',
                          params: {
                            quickSplitId: item.quickSplitId,
                            expenseId: item.id,
                            from: 'home',
                          },
                        } as never)
                      }
                    />
                  ))}
                </View>
              </HomeSection>
            ) : null}
            <HomeSection
              title={t('home.recentGroups')}
              onViewAll={() => router.push('/spaces' as never)}
            >
              <View style={styles.stack}>
                {data?.trips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onPress={() => router.push(`/groups/${trip.id}` as never)}
                  />
                ))}
              </View>
            </HomeSection>
            <HomeSection
              title={t('home.savingGoals')}
              onViewAll={() => router.push('/goals' as never)}
            >
              {data && data.goals.length > 0 ? (
                <View style={styles.stack}>
                  {data.goals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      item={goal}
                      onPress={() =>
                        router.push({
                          pathname: '/goals/[id]',
                          params: { id: goal.id, from: 'home' },
                        } as never)
                      }
                    />
                  ))}
                </View>
              ) : (
                <Card style={styles.goalEmpty}>
                  <Text style={styles.goalEmptyTitle}>
                    {t('home.savingGoals')}
                  </Text>
                  <Text style={styles.goalEmptyCopy}>
                    {t('home.createGoal')}
                  </Text>
                  <Button
                    onPress={() =>
                      router.push({
                        pathname: '/goals/new',
                        params: { from: 'home' },
                      } as never)
                    }
                    style={styles.goalEmptyButton}
                  >
                    <Text style={styles.goalEmptyButtonText}>
                      {t('home.createGoal')}
                    </Text>
                  </Button>
                </Card>
              )}
            </HomeSection>
            {data && data.debts.length > 0 ? (
              <HomeSection
                title={t('home.recentDebts')}
                onViewAll={() => router.push('/debts' as never)}
              >
                <View style={styles.stack}>
                  {data.debts.map((debt) => (
                    <DebtCard
                      key={debt.id}
                      item={debt}
                      onPress={() => router.push(`/debts/${debt.id}` as never)}
                    />
                  ))}
                </View>
              </HomeSection>
            ) : null}
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Card style={styles.empty}>
      <View style={styles.logoStack}>
        <View style={styles.logoPink} />
        <View style={styles.logoWhite}>
          <Image
            source={require('@/assets/images/home/logo.webp')}
            style={styles.logo}
            contentFit="cover"
          />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{t('groups.noGroupsTitle')}</Text>
      <Text style={styles.emptyText}>{t('groups.noGroupsCopy')}</Text>
      <Button onPress={onPress} variant="outline" style={styles.createButton}>
        <Text style={styles.createIcon}>＋</Text>
        <Text style={styles.createText}>{t('home.createNewGroup')}</Text>
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: {
    paddingHorizontal: 16,
    // Keep the last card above the floating glass tab bar.
    paddingBottom: 152,
    backgroundColor: '#FAFAFA',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { color: '#202124', fontSize: 18, lineHeight: 27 },
  name: { color: '#DE034D', fontWeight: '700' },
  welcome: { color: '#626262', fontSize: 12 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bellText: {
    color: '#202124',
    fontSize: 23,
    transform: [{ rotate: '180deg' }],
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#DE034D',
  },
  actions: { flexDirection: 'row', gap: 16, marginTop: 28 },
  stack: { gap: 14 },
  goalEmpty: { gap: 8, padding: 20, alignItems: 'center' },
  goalEmptyTitle: { color: '#111827', fontSize: 16, fontWeight: '600' },
  goalEmptyCopy: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
  goalEmptyButton: { marginTop: 4, paddingHorizontal: 20 },
  goalEmptyButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  error: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: '#fff0f3',
    padding: 12,
  },
  errorText: { color: '#a00036', fontSize: 13 },
  empty: {
    flex: 1,
    minHeight: 410,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  logoStack: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPink: {
    position: 'absolute',
    right: 7,
    top: 15,
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#DE034D',
  },
  logoWhite: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  logo: { width: 64, height: 64, borderRadius: 18 },
  emptyTitle: {
    marginTop: 18,
    color: '#202124',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8,
    maxWidth: 320,
    color: '#5e5e5e',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  createButton: {
    width: '100%',
    height: 48,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createIcon: { color: '#202124', fontSize: 21 },
  createText: { color: '#202124', fontSize: 15, fontWeight: '500' },
});
