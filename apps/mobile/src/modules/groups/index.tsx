import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { cacheGroups, readCachedGroups } from '@/lib/groups-list-cache';
import { getPendingGroups, syncPendingGroups } from '@/lib/offline-group-queue';
import { TripCard } from '@/modules/home/components/trip-card';
import type { HomeTrip } from '@/modules/home/home.types';

type Group = {
  id: string;
  name: string;
  description?: string | null;
  type?: string;
  imageUrl?: string | null;
  createdAt?: string;
  members?: Array<{ id: string; name: string; image: string | null }>;
  participantBalances?: Array<{
    memberName?: string;
    currency?: string;
    label: string;
    direction?: 'theyOweYou' | 'youOweThem';
    amount?: number;
  }>;
  hasExpenses?: boolean;
};
type GroupPage = {
  data: Group[];
  pagination?: { nextCursor?: string | null; total?: number };
};
type GroupFilter = 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';

export default function GroupsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GroupFilter>('all');
  const pendingGroupsQuery = useQuery({
    queryKey: ['offline-pending-groups'],
    queryFn: getPendingGroups,
  });
  const cachedGroupsQuery = useQuery({
    queryKey: ['cached-groups-list'],
    queryFn: readCachedGroups,
    staleTime: Number.POSITIVE_INFINITY,
  });
  useEffect(() => {
    void syncPendingGroups().then(() => {
      void queryClient.invalidateQueries({
        queryKey: ['offline-pending-groups'],
      });
      void queryClient.invalidateQueries({ queryKey: ['groups-list'] });
    });
  }, [queryClient]);
  const groupsQuery = useInfiniteQuery({
    queryKey: ['groups-list', search.trim(), filter],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await groupsClient.index.$get({
        query: {
          limit: '50',
          filter,
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      if (!response.ok) throw new Error('groups_load_failed');
      const page = (await response.json()) as unknown as GroupPage;
      try {
        await cacheGroups(page.data);
        queryClient.setQueryData<Group[]>(
          ['cached-groups-list'],
          (current = []) => {
            const merged = new Map(current.map((group) => [group.id, group]));
            for (const group of page.data) merged.set(group.id, group);
            return [...merged.values()];
          },
        );
      } catch {
        // Cache persistence is best effort and must not block the response.
      }
      return page;
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
  });
  const groups = groupsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const visibleGroups = groupsQuery.data
    ? groups
    : filterCachedGroups(cachedGroupsQuery.data ?? [], search, filter);
  const visiblePendingGroups =
    filter === 'all' || filter === 'noDebt'
      ? (pendingGroupsQuery.data ?? []).filter((group) => {
          const normalizedSearch = search.trim().toLocaleLowerCase('es-CO');
          return (
            !normalizedSearch ||
            group.payload.name
              .toLocaleLowerCase('es-CO')
              .includes(normalizedSearch)
          );
        })
      : [];
  const totalGroups =
    groupsQuery.data?.pages[0]?.pagination?.total ?? visibleGroups.length;
  const trips = visibleGroups.map(toTrip);
  const hasLocalGroups =
    visibleGroups.length > 0 || visiblePendingGroups.length > 0;
  const sections = [
    ['Recientes', trips.filter((trip) => ageInDays(trip.createdAt) <= 30)],
    [
      'Últimos dos meses',
      trips.filter((trip) => {
        const age = ageInDays(trip.createdAt);
        return age > 30 && age <= 60;
      }),
    ],
    ['Anteriores', trips.filter((trip) => ageInDays(trip.createdAt) > 60)],
  ] as const;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={groupsQuery.isRefetching}
            onRefresh={() => void groupsQuery.refetch()}
          />
        }
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 160 &&
            groupsQuery.hasNextPage &&
            !groupsQuery.isFetchingNextPage
          ) {
            void groupsQuery.fetchNextPage();
          }
        }}
      >
        <View style={styles.top}>
          <Text style={styles.heading}>Espacios</Text>
          <Button
            onPress={() =>
              router.push({
                pathname: '/groups/new',
                params: { from: 'groups' },
              } as never)
            }
          >
            <Text style={styles.buttonText}>＋ Crear</Text>
          </Button>
        </View>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar espacios"
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
              ['theyOweYou', 'Te deben'],
              ['youOweThem', 'Debes'],
              ['noDebt', 'Sin deudas'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
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
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {groupsQuery.isLoading
              ? 'Cargando espacios…'
              : `${totalGroups} espacios`}
          </Text>
          <Text style={styles.metaText}>{trips.length} visibles</Text>
        </View>
        {groupsQuery.isLoading && visibleGroups.length === 0 ? (
          <Spinner color="#DE034D" />
        ) : groupsQuery.isError && !hasLocalGroups ? (
          <Card style={styles.empty}>
            <Text style={styles.emptyTitle}>
              No se pudieron cargar los espacios
            </Text>
            <Button onPress={() => void groupsQuery.refetch()}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : visibleGroups.length === 0 ? (
          visiblePendingGroups.length ? null : (
            <Card style={styles.empty}>
              <Text style={styles.emptyTitle}>Aún no tienes espacios</Text>
              <Text style={styles.copy}>
                Crea un espacio para organizar un viaje con tu grupo.
              </Text>
              <Button
                onPress={() =>
                  router.push({
                    pathname: '/groups/new',
                    params: { from: 'groups' },
                  } as never)
                }
              >
                <Text style={styles.buttonText}>Crear espacio</Text>
              </Button>
            </Card>
          )
        ) : (
          sections.map(([title, sectionTrips]) =>
            sectionTrips.length > 0 ? (
              <View key={title} style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {sectionTrips.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    onPress={() => router.push(`/groups/${trip.id}` as never)}
                  />
                ))}
              </View>
            ) : null,
          )
        )}
        {visiblePendingGroups.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pendientes de sincronización
            </Text>
            {visiblePendingGroups.map((pending) => (
              <Button
                key={pending.id}
                variant="ghost"
                style={styles.pendingCard}
                onPress={() => router.push(`/groups/${pending.id}` as never)}
              >
                <Text style={styles.pendingTitle}>{pending.payload.name}</Text>
                <Text style={styles.copy}>
                  Pendiente de sincronización · creado sin conexión
                </Text>
              </Button>
            ))}
          </View>
        ) : null}
        {groupsQuery.isFetchingNextPage ? <Spinner color="#DE034D" /> : null}
        {groupsQuery.data &&
        !groupsQuery.hasNextPage &&
        visibleGroups.length > 0 ? (
          <Text style={styles.noMore}>No hay más espacios</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function toTrip(group: Group): HomeTrip & { createdAt: string } {
  const isPersonal = group.type === 'personal';
  const balances = group.participantBalances ?? [];
  const totals = new Map<string, number>();
  for (const balance of balances) {
    const currency = balance.currency ?? '';
    const signedAmount =
      balance.direction === 'theyOweYou'
        ? (balance.amount ?? 0)
        : -(balance.amount ?? 0);
    totals.set(currency, (totals.get(currency) ?? 0) + signedAmount);
  }
  const firstTotal = Array.from(totals.entries()).find(
    ([, amount]) => Math.abs(amount) >= 0.01,
  );
  const totalLabel = firstTotal
    ? `${firstTotal[1] > 0 ? 'Te deben' : 'Debes'} ${Math.abs(firstTotal[1]).toLocaleString('es-CO')} ${firstTotal[0]}`
    : undefined;
  return {
    id: group.id,
    name: group.name,
    imageUrl: group.imageUrl ?? null,
    isPersonal,
    createdAt: group.createdAt ?? new Date(0).toISOString(),
    members: isPersonal ? [] : selectMembers(group.members ?? []),
    balanceLabel: totalLabel,
    balanceItems: balances.slice(0, 2).map((balance) => ({
      person: balance.memberName ?? 'Participante',
      amount: balance.label,
    })),
    balanceOverflowLabel:
      balances.length > 2 ? `Otras ${balances.length - 2} personas` : undefined,
    dates: `Creado el ${new Date(group.createdAt ?? 0).toLocaleDateString('es-CO')}`,
    emptyLabel: isPersonal
      ? undefined
      : balances.length > 0
        ? undefined
        : group.hasExpenses
          ? 'Sin saldos pendientes'
          : 'Sin gastos',
  };
}

function selectMembers(members: Group['members']) {
  if (!members || members.length <= 2) return members ?? [];
  return [members[0], members[members.length - 1]].filter(
    (member): member is NonNullable<Group['members']>[number] =>
      Boolean(member),
  );
}

function filterCachedGroups(
  groups: Group[],
  search: string,
  filter: GroupFilter,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase('es-CO');
  return groups.filter((group) => {
    if (
      normalizedSearch &&
      !group.name.toLocaleLowerCase('es-CO').includes(normalizedSearch)
    ) {
      return false;
    }
    if (filter === 'all') return true;
    const balances = group.participantBalances ?? [];
    if (filter === 'noDebt') return balances.length === 0;
    return balances.some((balance) => balance.direction === filter);
  });
}

function ageInDays(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - date.getTime()) / 86_400_000);
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heading: { color: '#0F172A', fontSize: 30, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  search: { backgroundColor: '#FFFFFF', borderRadius: 24, height: 44 },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  metaText: { color: '#64748B', fontSize: 12 },
  filters: { gap: 8, paddingVertical: 2 },
  card: { gap: 8, padding: 16 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  copyWrap: { flex: 1, gap: 4 },
  cardTitle: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  link: { color: '#DE034D', fontSize: 13, fontWeight: '600' },
  filterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterTextOutline: { color: '#0F172A' },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  emptyTitle: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
  section: { gap: 10 },
  sectionTitle: { color: '#475569', fontSize: 14, fontWeight: '500' },
  pendingCard: {
    borderColor: '#DE034D',
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  pendingTitle: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  noMore: { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
});
