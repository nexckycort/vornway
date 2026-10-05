import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { quickSplitsClient } from '@/api/quick-splits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';
import { useExpenseEntryData } from '../hooks/use-expense-entry-data';

type Expense = {
  id: string;
  quickSplitId: string;
  description: string;
  amount: number;
  currency: string;
  quickSplitName?: string;
  paidBy?: { name: string; userId?: string | null };
  currentUserBalance?: number;
  participants?: Array<{ id: string; name: string }>;
};
type ExpenseFilter = 'all' | 'settled' | 'owed' | 'owe';
export default function ExpensesScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUserId = (session as { user?: { id?: string | null } } | null)
    ?.user?.id;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const { recentFriends, isLoading: friendsLoading } = useExpenseEntryData();
  const expensesQuery = useInfiniteQuery({
    queryKey: ['quick-split-expenses'],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await quickSplitsClient.expenses.$get({
        query: { limit: '50', ...(pageParam ? { cursor: pageParam } : {}) },
      });
      if (!response.ok) throw new Error('expenses_load_failed');
      return (await response.json()) as {
        data: Expense[];
        pagination?: { nextCursor?: string | null };
      };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
  });
  const visible = (
    expensesQuery.data?.pages.flatMap((page) => page.data) ?? []
  ).filter((item) => {
    const matchesSearch =
      `${item.description} ${item.quickSplitName ?? ''} ${item.paidBy?.name ?? ''} ${(item.participants ?? []).map((participant) => participant.name).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const balance = item.currentUserBalance ?? 0;
    const matchesFilter =
      filter === 'all' ||
      (filter === 'settled' && balance === 0) ||
      (filter === 'owed' && balance > 0) ||
      (filter === 'owe' && balance < 0);
    return matchesSearch && matchesFilter;
  });
  const friends = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es-CO');
    return recentFriends
      .filter((friend) =>
        normalizedSearch
          ? friend.name.toLocaleLowerCase('es-CO').includes(normalizedSearch)
          : true,
      )
      .slice(0, 12);
  }, [recentFriends, search]);
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={expensesQuery.isRefetching}
            onRefresh={() => void expensesQuery.refetch()}
          />
        }
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 160 &&
            expensesQuery.hasNextPage &&
            !expensesQuery.isFetchingNextPage
          ) {
            void expensesQuery.fetchNextPage();
          }
        }}
      >
        <Text style={styles.heading}>Gastos compartidos</Text>
        <Button
          onPress={() =>
            router.push({
              pathname: '/expenses/new',
              params: { from: 'friends' },
            } as never)
          }
        >
          <Text style={styles.buttonText}>＋ Nuevo gasto</Text>
        </Button>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar gastos"
          style={styles.search}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(
            [
              ['all', 'Todos'],
              ['settled', 'Salda'],
              ['owed', 'Le deben'],
              ['owe', 'Debe'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={filter === value ? 'default' : 'outline'}
              onPress={() => setFilter(value)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter !== value && styles.filterTextOutline,
                ]}
              >
                {label}
              </Text>
            </Button>
          ))}
        </ScrollView>
        <View style={styles.friendSection}>
          <Text style={styles.sectionTitle}>Amigos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.friends}
          >
            <Button
              variant="ghost"
              style={styles.friendButton}
              onPress={() =>
                router.push({
                  pathname: '/expenses/new',
                  params: { from: 'friends' },
                } as never)
              }
            >
              <View style={styles.addFriend}>
                <Text style={styles.addFriendText}>＋</Text>
              </View>
              <Text numberOfLines={1} style={styles.friendName}>
                Agregar
              </Text>
            </Button>
            {friendsLoading ? <Spinner color="#DE034D" /> : null}
            {!friendsLoading && friends.length === 0 && search.trim() ? (
              <Text style={styles.copy}>No se encontraron amigos</Text>
            ) : null}
            {friends.map((friend) => (
              <Button
                key={friend.id}
                variant="ghost"
                style={styles.friendButton}
                onPress={() =>
                  router.push({
                    pathname: '/expenses/quick-split',
                    params: {
                      from: 'friends',
                      participants: friend.name,
                      participantData: JSON.stringify([
                        {
                          name: friend.name,
                          ...(friend.userId ? { userId: friend.userId } : {}),
                        },
                      ]),
                    },
                  } as never)
                }
              >
                {friend.image ? (
                  <Image
                    source={{ uri: friend.image }}
                    style={styles.friendAvatar}
                  />
                ) : (
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendInitial}>
                      {toInitials(friend.name)}
                    </Text>
                  </View>
                )}
                <Text numberOfLines={1} style={styles.friendName}>
                  {friend.name}
                </Text>
              </Button>
            ))}
          </ScrollView>
        </View>
        {expensesQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : expensesQuery.isError ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No se pudieron cargar los gastos</Text>
            <Button onPress={() => void expensesQuery.refetch()}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : visible.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No hay gastos compartidos</Text>
            <Text style={styles.copy}>
              {expensesQuery.data?.pages.some((page) => page.data.length > 0)
                ? 'No hay gastos que coincidan con tu búsqueda o filtro.'
                : 'Crea un gasto para dividirlo con tus amigos.'}
            </Text>
          </Card>
        ) : (
          visible.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Button
                variant="ghost"
                onPress={() =>
                  router.push({
                    pathname: '/expenses/friends/[quickSplitId]/[expenseId]',
                    params: {
                      quickSplitId: item.quickSplitId,
                      expenseId: item.id,
                      from: 'friends',
                    },
                  } as never)
                }
              >
                <Text style={styles.title}>{item.description}</Text>
                <Text style={styles.copy}>
                  {item.quickSplitName || 'Gasto compartido'}
                </Text>
                {item.participants?.length ? (
                  <Text style={styles.copy}>
                    {item.participants
                      .slice(0, 3)
                      .map((participant) => participant.name)
                      .join(' · ')}
                  </Text>
                ) : null}
                <Text style={styles.amount}>
                  {formatMoney(item.amount, item.currency)}
                </Text>
                <Text style={styles.copy}>
                  {item.paidBy?.name
                    ? `Pagado por ${item.paidBy.userId === currentUserId ? 'ti' : item.paidBy.name}`
                    : ''}
                </Text>
                <Text
                  style={[
                    styles.balance,
                    (item.currentUserBalance ?? 0) > 0
                      ? styles.balancePositive
                      : (item.currentUserBalance ?? 0) < 0
                        ? styles.balanceNegative
                        : styles.balanceNeutral,
                  ]}
                >
                  {formatBalance(item.currentUserBalance ?? 0, item.currency)}
                </Text>
              </Button>
            </Card>
          ))
        )}
        {expensesQuery.isFetchingNextPage ? <Spinner color="#DE034D" /> : null}
        {expensesQuery.data &&
        !expensesQuery.hasNextPage &&
        visible.length > 0 ? (
          <Text style={styles.noMore}>No hay más gastos</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  heading: { color: '#0F172A', fontSize: 28, fontWeight: '600' },
  search: { backgroundColor: '#FFFFFF', borderRadius: 24, height: 44 },
  filters: { gap: 8, paddingVertical: 2 },
  friendSection: { gap: 10, marginTop: 8 },
  sectionTitle: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  friends: { gap: 14, paddingHorizontal: 2 },
  friendButton: { alignItems: 'center', gap: 5, width: 64 },
  addFriend: {
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    borderColor: '#DE034D',
    borderRadius: 22,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  addFriendText: { color: '#DE034D', fontSize: 22 },
  friendAvatar: {
    alignItems: 'center',
    backgroundColor: '#E7E7E7',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  friendInitial: { color: '#4C4C4C', fontSize: 16, fontWeight: '600' },
  friendName: { color: '#4C4C4C', fontSize: 11, maxWidth: 64 },
  card: { gap: 6, padding: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  amount: { color: '#DE034D', fontSize: 18, fontWeight: '600' },
  balance: { fontSize: 12, fontWeight: '500' },
  balancePositive: { color: '#16803C' },
  balanceNegative: { color: '#D92D20' },
  balanceNeutral: { color: '#797979' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  filterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterTextOutline: { color: '#0F172A' },
  noMore: { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
});

function formatBalance(value: number, currency: string) {
  if (value === 0) return 'Saldado';
  const amount = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return value > 0 ? `Te deben ${amount}` : `Debes ${amount}`;
}

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString('es-CO')} ${currency}`;
  }
}

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
