import { createFileRoute, Link, useLocation } from '@tanstack/react-router';
import { Search, Users, WifiOff } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  getGroupFlowEntryState,
  getLocationHref,
} from '#/lib/group-flow-navigation';
import {
  type GroupListFilter,
  type GroupListItem,
  getCachedGroupListItems,
  getEmptyGroupListItems,
  subscribeGroupListItems,
} from '#/lib/groups-list-query-collection';
import { formatCurrency, formatShortDate, getIntlLocale } from '#/lib/i18n';
import {
  getEmptyPendingGroups,
  getPendingGroups,
  subscribePendingGroups,
} from '#/lib/offline-group-query-collection';
import { TripCard } from '#/routes/_authed/(home)/-components/trip-card';
import type { Trip } from '#/routes/_authed/(home)/-hooks/use-home-query';
import { useGroupsInfiniteQuery } from '#/routes/_authed/groups/-hooks/use-groups-infinite-query';
import { getGroupsMessages } from '#/routes/_authed/groups/-messages';
import { GroupsSkeleton } from './-components/groups-skeleton';

export const Route = createFileRoute('/_authed/groups/')({
  component: RouteComponent,
});

function RouteComponent() {
  const t = getGroupsMessages();
  const location = useLocation();
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
      groups.map((group) => {
        const balanceTotalsByCurrency = new Map<string, number>();
        for (const item of group.participantBalances) {
          const signedAmount =
            item.direction === 'theyOweYou' ? item.amount : -item.amount;
          balanceTotalsByCurrency.set(
            item.currency,
            (balanceTotalsByCurrency.get(item.currency) ?? 0) + signedAmount,
          );
        }

        const balanceItems = group.participantBalances.map((item) => ({
          person: item.memberName,
          amount: item.label,
        }));
        const visibleBalanceItems = balanceItems.slice(0, 2);
        const overflowCount = Math.max(
          0,
          balanceItems.length - visibleBalanceItems.length,
        );
        const balanceTotals = Array.from(
          balanceTotalsByCurrency.entries(),
        ).filter(([, value]) => Math.abs(value) >= 0.01);
        const firstTotal = balanceTotals[0];

        return {
          id: group.id,
          name: group.name,
          dates: t.home.createdAt(formatShortDate(group.createdAt)),
          imageUrl: group.imageUrl,
          avatars: mapMembersToAvatars(group.members),
          extraPeople: Math.max(0, group.members.length - 2),
          ...(group.participantBalances.length > 0
            ? {
                balanceLabel: firstTotal
                  ? firstTotal[1] > 0
                    ? `${t.theyOweYou} ${formatCurrency(
                        firstTotal[0],
                        Math.abs(firstTotal[1]),
                      )}`
                    : `${t.youOweThem} ${formatCurrency(
                        firstTotal[0],
                        Math.abs(firstTotal[1]),
                      )}`
                  : t.home.noPendingBalances,
                balanceItems: visibleBalanceItems,
                ...(overflowCount > 0
                  ? {
                      balanceOverflowLabel: t.home.otherBalances(overflowCount),
                    }
                  : {}),
              }
            : {
                emptyLabel: group.hasExpenses
                  ? t.home.noPendingBalances
                  : t.home.noExpenses,
              }),
          createdAt: group.createdAt,
        };
      }) as Array<Trip & { createdAt: string }>,
    [groups, t.home],
  );

  const groupedTrips = useMemo(
    () => buildTripSections(groupTrips),
    [groupTrips],
  );
  const filters: Array<{ value: GroupListFilter; label: string }> = [
    { value: 'all', label: t.all },
    { value: 'theyOweYou', label: t.theyOweYou },
    { value: 'youOweThem', label: t.youOweThem },
    { value: 'noDebt', label: t.noDebt },
  ];

  const visiblePendingGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(getIntlLocale());
    if (filter !== 'all' && filter !== 'noDebt') return [];

    return pendingGroups.filter((group) => {
      if (!normalizedSearch) return true;
      return group.payload.name
        .toLocaleLowerCase(getIntlLocale())
        .includes(normalizedSearch);
    });
  }, [filter, pendingGroups, search]);

  const total = groupsQuery.data?.pages[0]?.pagination.total ?? groups.length;
  const hasLocalGroups = groups.length > 0 || visiblePendingGroups.length > 0;
  const flowReturnTo = getLocationHref(location);

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="flex min-h-screen w-full flex-col bg-[#fafafa] px-4 pb-28 pt-6">
        <header>
          <h1 className="mt-2 text-3xl font-semibold leading-9 text-[#0f172a]">
            {t.title}
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
            + {t.createNew}
          </Link>

          <label className="mt-4 flex h-12 items-center gap-3 rounded-full border border-[#e2e8f0] bg-white px-4 shadow-[0_6px_16px_rgba(15,23,42,0.04)]">
            <Search className="size-4 shrink-0 text-[#94a3b8]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
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
              {groupsQuery.isLoading ? t.loadingGroups : t.totalGroups(total)}
            </p>
            <p className="text-sm text-[#64748b]">
              {t.visibleGroups(groupTrips.length)}
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
              {t.noGroupsTitle}
            </p>
            <p className="mt-2 text-sm text-[#64748b]">{t.noGroupsCopy}</p>
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
              {t.common.createGroup}
            </Link>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-5">
          {visiblePendingGroups.length > 0 ? (
            <section className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-[#475569]">
                {t.pendingSync}
              </h2>
              <div className="flex flex-col gap-4">
                {visiblePendingGroups.map((group) => (
                  <Link
                    key={group.id}
                    to="/groups/$id"
                    params={{ id: group.id }}
                    state={getGroupFlowEntryState(flowReturnTo)}
                    className="rounded-[24px] border border-dashed border-primary/35 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold leading-7">
                          {group.payload.name}
                        </h3>
                        <p className="text-xs leading-4 text-[#64748b]">
                          {t.createdOffline}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                        <WifiOff className="size-3" />
                        {t.pendingBadge}
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-5 text-[#64748b]">
                      {t.pendingCopy}
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
          <p className="text-center text-sm text-[#64748b]">{t.loadingMore}</p>
        ) : null}

        {groupsQuery.data && !groupsQuery.hasNextPage && groups.length > 0 ? (
          <p className="text-center text-sm text-[#94a3b8]">{t.noMore}</p>
        ) : null}
      </div>
    </main>
  );
}

function filterCachedGroups(
  groups: GroupListItem[],
  search: string,
  filter: GroupListFilter,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase(getIntlLocale());

  return groups.filter((group) => {
    if (
      normalizedSearch &&
      !group.name.toLocaleLowerCase(getIntlLocale()).includes(normalizedSearch)
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
  const t = getGroupsMessages();
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
      title: t.recent,
      trips: sections.recent,
    },
    {
      title: t.lastTwoMonths,
      trips: sections.lastTwoMonths,
    },
    {
      title: t.older,
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
