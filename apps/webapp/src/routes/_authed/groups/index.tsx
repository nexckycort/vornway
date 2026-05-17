import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useRef } from 'react';
import { TripCard } from '#/routes/_authed/(home)/-components/trip-card';
import type { Trip } from '#/routes/_authed/(home)/-hooks/use-home-query';
import { useGroupsInfiniteQuery } from '#/routes/_authed/groups/-hooks/use-groups-infinite-query';

export const Route = createFileRoute('/_authed/groups/')({
  component: RouteComponent,
});

function RouteComponent() {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const groupsQuery = useGroupsInfiniteQuery();

  const groups = useMemo(
    () => groupsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [groupsQuery.data],
  );
  const total = groupsQuery.data?.pages[0]?.pagination.total ?? 0;

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
              balanceLabel: mapBalances(group)[0]?.label ?? 'Sin saldos pendientes',
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

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-10 pt-6">
        <header className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">
              Mis grupos
            </h1>
            <Link
              to="/groups/new"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Crear grupo
            </Link>
          </div>
          <p className="text-sm text-[#64748b]">
            {groupsQuery.isLoading ? 'Cargando grupos...' : `${total} grupos en total`}
          </p>
        </header>

        {groupsQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(groupsQuery.error as Error).message}
          </div>
        ) : null}

        {!groupsQuery.isLoading && groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-5 py-8 text-center text-sm text-[#64748b]">
            Aún no tienes grupos.
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          {groupTrips.map((trip) => (
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
