import { createFileRoute, Link } from '@tanstack/react-router';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TripCard } from '#/routes/_authed/(home)/-components/trip-card';
import type { Trip } from '#/routes/_authed/(home)/-hooks/use-home-query';
import { useGroupsInfiniteQuery } from '#/routes/_authed/groups/-hooks/use-groups-infinite-query';

type GroupFilter = 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';

export const Route = createFileRoute('/_authed/groups/')({
  component: RouteComponent,
});

function RouteComponent() {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const groupsQuery = useGroupsInfiniteQuery();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GroupFilter>('all');

  const groups = useMemo(
    () => groupsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [groupsQuery.data],
  );

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
        avatars: mapMembersToAvatars(group.members),
        extraPeople: Math.max(0, group.members.length - 2),
        ...(mapBalances(group).length > 0
          ? {
              balanceLabel:
                mapBalances(group)[0]?.label ?? 'Sin saldos pendientes',
              balanceItems: mapBalances(group).slice(0, 2).map((item) => ({
                person: item.memberName,
                amount: item.label,
              })),
              ...(mapBalances(group).length > 2
                ? {
                    balanceOverflowLabel: `y ${mapBalances(group).length - 2} otros saldos`,
                  }
                : {}),
            }
          : {
              emptyLabel: group.hasExpenses ? 'Sin saldos pendientes' : 'Sin gastos',
            }),
      })) as Trip[],
    [groups],
  );

  const filteredTrips = useMemo(() => {
    const searchValue = search.trim().toLocaleLowerCase('es-CO');

    return groupTrips.filter((trip) => {
      const source = groups.find((group) => group.id === trip.id);
      if (!source) return false;

      const matchesSearch =
        searchValue.length === 0 ||
        trip.name.toLocaleLowerCase('es-CO').includes(searchValue);

      if (!matchesSearch) return false;

      if (filter === 'all') return true;

      const hasCredits = source.participantBalances.some(
        (item) => item.direction === 'theyOweYou' && item.amount > 0,
      );
      const hasDebts = source.participantBalances.some(
        (item) => item.direction === 'youOweThem' && item.amount > 0,
      );

      if (filter === 'theyOweYou') return hasCredits;
      if (filter === 'youOweThem') return hasDebts;
      return !hasCredits && !hasDebts;
    });
  }, [filter, groupTrips, groups, search]);

  const total = groupsQuery.data?.pages[0]?.pagination.total ?? 0;

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-28 pt-6">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
            Lista de viajes / Filled
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-9 text-[#0f172a]">
            Mis grupos
          </h1>

          <Link
            to="/groups/new"
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-base font-medium text-white shadow-[0_10px_24px_rgba(222,3,77,0.18)]"
          >
            + Crear grupo
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
              {groupsQuery.isLoading ? 'Cargando grupos...' : `${total} grupos en total`}
            </p>
            <p className="text-sm text-[#64748b]">
              {filteredTrips.length} visibles
            </p>
          </div>
        </header>

        {groupsQuery.isError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(groupsQuery.error as Error).message}
          </div>
        ) : null}

        {!groupsQuery.isLoading && filteredTrips.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-5 py-8 text-center text-sm text-[#64748b]">
            No encontramos grupos con esos filtros.
          </div>
        ) : null}

        <section className="mt-5 flex flex-col gap-4">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </section>

        <div ref={loadMoreRef} className="h-8" />

        {groupsQuery.isFetchingNextPage ? (
          <p className="text-center text-sm text-[#64748b]">Cargando más...</p>
        ) : null}

        {!groupsQuery.hasNextPage && groups.length > 0 ? (
          <p className="text-center text-sm text-[#94a3b8]">
            No hay más grupos por cargar.
          </p>
        ) : null}
      </div>
    </main>
  );
}

const filters: Array<{ value: GroupFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'theyOweYou', label: 'Te deben' },
  { value: 'youOweThem', label: 'Debo' },
  { value: 'noDebt', label: 'Sin deuda' },
];

function mapMembersToAvatars(
  members: Array<{ name: string; image: string | null }>,
) {
  const visibleMembers =
    members.length <= 2
      ? members
      : [members[0], members[members.length - 1]].filter(
          Boolean,
        ) as Array<{ name: string; image: string | null }>;

  return visibleMembers.map((member) => ({
    name: member.name,
    image: member.image,
  }));
}

function mapBalances(group: {
  participantBalances: Array<{
    memberName: string;
    amount: number;
    currency: string;
    direction: 'theyOweYou' | 'youOweThem';
    label: string;
  }>;
}) {
  return group.participantBalances;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}
