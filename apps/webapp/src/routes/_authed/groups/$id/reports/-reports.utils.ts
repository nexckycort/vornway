type ReportTab = 'balance' | 'totales';

type ReportDateFilterMode = 'all' | 'day' | 'range';

type CategoryBreakdownItem = {
  key: string;
  id: string | null;
  name: string;
  icon: string | null;
  amount: number;
  fill: string;
};

type ShareMember = {
  memberId: string;
  name: string;
  isCurrentUser: boolean;
  shares: Record<string, number>;
  categorySharesByCurrency: Record<string, Record<string, number>>;
};

type GroupMember = {
  id: string;
  name: string;
  isCurrentUser: boolean;
};

type GroupSummaryCounterpartyFields = {
  members: GroupMember[];
  directDebts: Array<{
    toMemberId: string;
    currency: string;
    amount: number;
  }>;
  directCredits: Array<{
    fromMemberId: string;
    currency: string;
    amount: number;
  }>;
};

export type ReportsRouteSearch = {
  tab: ReportTab;
};

export type ReportsFilterInput = {
  dateFilterMode: ReportDateFilterMode;
  rangeEndDate: string;
  rangeStartDate: string;
  selectedDay: string;
};

export function parseReportsSearch(search: Record<string, unknown>) {
  return {
    tab:
      search.tab === 'totales' || search.tab === 'balance'
        ? search.tab
        : 'balance',
  } satisfies ReportsRouteSearch;
}

export function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDayBoundaryIso(
  value: string,
  boundary: 'start' | 'end',
): string | undefined {
  const [year, month, day] = value.split('-').map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return undefined;
  }

  const date =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function buildReportFilter(input: ReportsFilterInput) {
  if (input.dateFilterMode === 'day') {
    return {
      range: 'custom' as const,
      startDate: toDayBoundaryIso(input.selectedDay, 'start'),
      endDate: toDayBoundaryIso(input.selectedDay, 'end'),
    };
  }

  if (input.dateFilterMode === 'range') {
    return {
      range: 'custom' as const,
      startDate: toDayBoundaryIso(input.rangeStartDate, 'start'),
      endDate: toDayBoundaryIso(input.rangeEndDate, 'end'),
    };
  }

  return { range: 'all' as const };
}

export function deriveAvailableCurrencies(input: {
  groupTotals?: Record<string, number>;
  reportTotals?: Record<string, number>;
}) {
  const currencies = new Set<string>();

  for (const entry of Object.keys(
    input.reportTotals ?? input.groupTotals ?? {},
  )) {
    currencies.add(entry);
  }

  return Array.from(currencies);
}

export function deriveBalanceMembers(
  group: GroupSummaryCounterpartyFields | null,
) {
  if (!group) return [];

  const currentMemberId =
    group.members.find((member) => member.isCurrentUser)?.id ?? null;
  const memberMap = new Map<
    string,
    {
      memberId: string;
      name: string;
      isCurrentUser: boolean;
      balances: Record<string, number>;
    }
  >();

  for (const member of group.members) {
    memberMap.set(member.id, {
      memberId: member.id,
      name: member.name,
      isCurrentUser: currentMemberId === member.id,
      balances: {},
    });
  }

  for (const debt of group.directDebts) {
    const member = memberMap.get(debt.toMemberId);
    if (!member) continue;
    member.balances[debt.currency] =
      (member.balances[debt.currency] ?? 0) - debt.amount;
  }

  for (const credit of group.directCredits) {
    const member = memberMap.get(credit.fromMemberId);
    if (!member) continue;
    member.balances[credit.currency] =
      (member.balances[credit.currency] ?? 0) + credit.amount;
  }

  return Array.from(memberMap.values())
    .filter((member) =>
      Object.values(member.balances).some((amount) => Math.abs(amount) >= 1),
    )
    .sort((left, right) => {
      if (left.isCurrentUser === right.isCurrentUser) return 0;
      return left.isCurrentUser ? -1 : 1;
    });
}

export function findSelectedCategory(
  categoryBreakdown: CategoryBreakdownItem[],
  selectedCategoryKey: string | null,
) {
  return (
    categoryBreakdown.find(
      (category) => category.key === selectedCategoryKey,
    ) ?? null
  );
}

export function deriveShareMembers(input: {
  memberShares?: ShareMember[];
  selectedCategoryKey: string | null;
  selectedCurrency: string;
}) {
  return Array.from(input.memberShares ?? [])
    .map((member) => ({
      ...member,
      visibleShare:
        input.selectedCategoryKey == null
          ? (member.shares[input.selectedCurrency] ?? 0)
          : (member.categorySharesByCurrency[input.selectedCurrency]?.[
              input.selectedCategoryKey
            ] ?? 0),
    }))
    .filter((member) => Math.abs(member.visibleShare) > 0)
    .sort((left, right) => {
      if (left.isCurrentUser !== right.isCurrentUser) {
        return left.isCurrentUser ? -1 : 1;
      }

      return right.visibleShare - left.visibleShare;
    });
}

export function buildChartConfig(entries: CategoryBreakdownItem[]) {
  return entries.reduce<Record<string, { label: string; color: string }>>(
    (accumulator, entry) => {
      accumulator[entry.name] = {
        label: entry.name,
        color: entry.fill,
      };
      return accumulator;
    },
    {},
  );
}
