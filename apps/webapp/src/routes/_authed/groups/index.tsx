import { createFileRoute, Link } from '@tanstack/react-router';
import { Search, Users, WifiOff } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  type GroupListFilter,
  type GroupListItem,
  getCachedGroupListItems,
  getEmptyGroupListItems,
  subscribeGroupListItems,
} from '#/lib/groups-list-query-collection';
import {
  getEmptyPendingGroups,
  getPendingGroups,
  subscribePendingGroups,
} from '#/lib/offline-group-query-collection';
import { TripCard } from '#/routes/_authed/(home)/-components/trip-card';
import type { Trip } from '#/routes/_authed/(home)/-hooks/use-home-query';
import { useGroupsInfiniteQuery } from '#/routes/_authed/groups/-hooks/use-groups-infinite-query';
import { GroupsSkeleton } from './-components/groups-skeleton';

export const Route = createFileRoute('/_authed/groups/')({
  component: RouteComponent,
});

function RouteComponent() {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GroupListFilter>('all');
  const cachedGroups = useSyncExternalStore(
    subscribeGroupListItems,
    getCachedGroupListItems,
    getEmptyGroupListItems,
  );
  const pendingGroups = useSyncExternalStore(
    subscribePendingGroups,
    getPendingGroups,
    getEmptyPendingGroups,
  );
  const groupsQuery = useGroupsInfiniteQuery({
    search,
    filter,
  });

  const serverGroups = useMemo(
    () => groupsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [groupsQuery.data],
  );

  const groups = useMemo(() => {
    if (groupsQuery.data) return serverGroups;
    return filterCachedGroups(cachedGroups, search, filter);
  }, [cachedGroups, filter, groupsQuery.data, search, serverGroups]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!groupsQuery.hasNextPage || groupsQuery.isFetching) return;
        void groupsQuery.fetchNextPage();
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [groupsQuery]);

  const groupTrips = useMemo(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        dates: `Creado ${formatShortDate(group.createdAt)}`,
        imageUrl: group.imageUrl,
        avatars: mapMembersToAvatars(group.members),
        extraPeople: Math.max(0, group.members.length - 2),
        ...(group.participantBalances.length > 0
          ? {
              balanceLabel:
                group.participantBalances[0]?.label ?? 'Sin saldos pendientes',
              balanceItems: group.participantBalances
                .slice(0, 2)
                .map((item) => ({
                  person: item.memberName,
                  amount: item.label,
                })),
              ...(group.participantBalances.length > 2
                ? {
                    balanceOverflowLabel: `y ${group.participantBalances.length - 2} otros saldos`,
                  }
                : {}),
            }
          : {
              emptyLabel: group.hasExpenses
                ? 'Sin saldos pendientes'
                : 'Sin gastos',
            }),
        createdAt: group.createdAt,
      })) as Array<Trip & { createdAt: string }>,
    [groups],
  );

  const groupedTrips = useMemo(
    () => buildTripSections(groupTrips),
    [groupTrips],
  );

  const visiblePendingGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es-CO');
    if (filter !== 'all' && filter !== 'noDebt') return [];

    return pendingGroups.filter((group) => {
      if (!normalizedSearch) return true;
      return group.payload.name
        .toLocaleLowerCase('es-CO')
        .includes(normalizedSearch);
    });
  }, [filter, pendingGroups, search]);

  const total = groupsQuery.data?.pages[0]?.pagination.total ?? groups.length;
  const hasLocalGroups = groups.length > 0 || visiblePendingGroups.length > 0;

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-28 pt-6">
        <header>
          <h1 className="mt-2 text-3xl font-semibold leading-9 text-[#0f172a]">
            Mis grupos
          </h1>

          <Link
            to="/groups/new"
            search={{
              name: '',
              type: '',
              description: '',
              draftId: '',
            }}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-medium text-white shadow-[0_10px_24px_rgba(222,3,77,0.18)]"
          >
            + Crear nuevo grupo
          </Link>

          <label className="mt-4 flex h-12 items-center gap-3 rounded-full border border-[#e2e8f0] bg-white px-4 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre de grupos"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#94a3b8]"
            />
          </label>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  filter === item.value
                    ? 'bg-primary text-white'
                    : 'border border-[#e2e8f0] bg-white text-[#334155]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-[#64748b]">
              {groupsQuery.isLoading
                ? 'Cargando grupos...'
                : `${total} grupos en total`}
            </p>
            <p className="text-sm text-[#64748b]">
              {groupTrips.length} visibles
            </p>
          </div>
        </header>

        {groupsQuery.isLoading && groups.length === 0 ? (
          <GroupsSkeleton />
        ) : null}

        {groupsQuery.isError && !hasLocalGroups ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(groupsQuery.error as Error).message}
          </div>
        ) : null}

        {!groupsQuery.isLoading &&
        groupTrips.length === 0 &&
        visiblePendingGroups.length === 0 ? (
          <div className="mt-5 rounded-[28px] border border-[#e2e8f0] bg-white px-5 py-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#eef2ff]">
              <Users className="size-7 text-primary" />
            </div>
            <p className="text-base font-semibold text-[#0f172a]">
              Aún no tienes grupos
            </p>
            <p className="mt-2 text-sm text-[#64748b]">
              Cuando crees un grupo aparecerá aquí con sus saldos y gastos.
            </p>
            <Link
              to="/groups/new"
              search={{
                name: '',
                type: '',
                description: '',
                draftId: '',
              }}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-white"
            >
              Crear grupo
            </Link>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-5">
          {visiblePendingGroups.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-[#475569]">
                Pendientes por sincronizar
              </h2>
              <div className="flex flex-col gap-4">
                {visiblePendingGroups.map((group) => (
                  <Link
                    key={group.id}
                    to="/groups/$id"
                    params={{ id: group.id }}
                    className="rounded-[24px] border border-dashed border-primary/35 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold leading-7">
                          {group.payload.name}
                        </h3>
                        <p className="text-xs leading-4 text-[#64748b]">
                          Creado sin conexión
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        <WifiOff className="size-3" />
                        Pendiente
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-5 text-[#64748b]">
                      Se creará automáticamente cuando vuelva la conexión.
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {groupedTrips.map((section) => (
            <section key={section.title} className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-[#475569]">
                {section.title}
              </h2>
              <div className="flex flex-col gap-4">
                {section.trips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div ref={loadMoreRef} className="h-8" />

        {groupsQuery.isFetchingNextPage ? (
          <p className="text-center text-sm text-[#64748b]">Cargando más...</p>
        ) : null}

        {groupsQuery.data && !groupsQuery.hasNextPage && groups.length > 0 ? (
          <p className="text-center text-sm text-[#94a3b8]">
            No hay más grupos por cargar.
          </p>
        ) : null}
      </div>
    </main>
  );
}

const filters: Array<{ value: GroupListFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'theyOweYou', label: 'Te deben' },
  { value: 'youOweThem', label: 'Debo' },
  { value: 'noDebt', label: 'Sin deuda' },
];

function filterCachedGroups(
  groups: GroupListItem[],
  search: string,
  filter: GroupListFilter,
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
    if (filter === 'noDebt') return group.participantBalances.length === 0;

    return group.participantBalances.some(
      (balance) => balance.direction === filter,
    );
  });
}

function mapMembersToAvatars(
  members: Array<{ name: string; image: string | null }>,
) {
  const visibleMembers =
    members.length <= 2
      ? members
      : ([members[0], members[members.length - 1]].filter(Boolean) as Array<{
          name: string;
          image: string | null;
        }>);

  return visibleMembers.map((member) => ({
    name: member.name,
    image: member.image,
  }));
}

function buildTripSections(trips: Array<Trip & { createdAt: string }>) {
  const sections = {
    recent: [] as Trip[],
    lastTwoMonths: [] as Trip[],
    older: [] as Trip[],
  };

  for (const trip of trips) {
    const bucket = getRecencyBucket(trip.createdAt);
    sections[bucket].push(trip);
  }

  return [
    {
      title: 'Más recientes',
      trips: sections.recent,
    },
    {
      title: 'Últimos 2 meses',
      trips: sections.lastTwoMonths,
    },
    {
      title: 'Más antiguos',
      trips: sections.older,
    },
  ].filter((section) => section.trips.length > 0);
}

function getRecencyBucket(value: string): 'recent' | 'lastTwoMonths' | 'older' {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return 'older';

  const diffDays = Math.floor(
    (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 30) return 'recent';
  if (diffDays <= 60) return 'lastTwoMonths';
  return 'older';
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}
