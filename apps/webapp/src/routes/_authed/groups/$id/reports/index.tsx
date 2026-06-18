import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import {
  useGroupReportsSharesQuery,
  useGroupReportsTotalsQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import { GroupReportBalanceTab } from './-components/group-report-balance-tab';
import { GroupReportTotalsTab } from './-components/group-report-totals-tab';

export const Route = createFileRoute('/_authed/groups/$id/reports/')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === 'totales' || search.tab === 'balance'
        ? search.tab
        : 'balance',
  }),
  component: RouteComponent,
});

type ReportDateFilterMode = 'all' | 'day' | 'range';

type GroupSummaryCounterpartyFields = {
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

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDayBoundaryIso(
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

function RouteComponent() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const t = getGroupDetailMessages();
  const navigate = useNavigate({ from: Route.fullPath });
  const { flowState, navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupQuery = useGroupSummaryQuery(id);
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('COP');
  const [dateFilterMode, setDateFilterMode] =
    useState<ReportDateFilterMode>('all');
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [rangeStartDate, setRangeStartDate] = useState<string>(today);
  const [rangeEndDate, setRangeEndDate] = useState<string>(today);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(
    null,
  );
  const activeTab = tab;
  const group = groupQuery.data;
  const reportFilter = useMemo(() => {
    if (dateFilterMode === 'day') {
      return {
        range: 'custom' as const,
        startDate: toDayBoundaryIso(selectedDay, 'start'),
        endDate: toDayBoundaryIso(selectedDay, 'end'),
      };
    }

    if (dateFilterMode === 'range') {
      return {
        range: 'custom' as const,
        startDate: toDayBoundaryIso(rangeStartDate, 'start'),
        endDate: toDayBoundaryIso(rangeEndDate, 'end'),
      };
    }

    return { range: 'all' as const };
  }, [dateFilterMode, rangeEndDate, rangeStartDate, selectedDay]);
  const reportsSharesQuery = useGroupReportsSharesQuery(
    id,
    reportFilter,
    activeTab === 'totales',
  );
  const reportsTotalsQuery = useGroupReportsTotalsQuery(
    id,
    reportFilter,
    activeTab === 'totales',
  );
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();

    for (const entry of Object.keys(
      reportsTotalsQuery.data?.totalsByCurrency ?? group?.totals ?? {},
    )) {
      currencies.add(entry);
    }

    return Array.from(currencies);
  }, [group?.totals, reportsTotalsQuery.data?.totalsByCurrency]);
  const sortedBalanceMembers = useMemo(() => {
    if (!group) return [];
    const summary = group as typeof group & GroupSummaryCounterpartyFields;
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

    for (const debt of summary.directDebts) {
      const member = memberMap.get(debt.toMemberId);
      if (!member) continue;
      member.balances[debt.currency] =
        (member.balances[debt.currency] ?? 0) - debt.amount;
    }

    for (const credit of summary.directCredits) {
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
  }, [group]);
  const categoryBreakdown =
    reportsTotalsQuery.data?.categoriesByCurrency[selectedCurrency] ?? [];
  const selectedCategory = useMemo(
    () =>
      categoryBreakdown.find(
        (category) => category.key === selectedCategoryKey,
      ) ?? null,
    [categoryBreakdown, selectedCategoryKey],
  );
  const sortedShareMembers = useMemo(
    () =>
      Array.from(reportsSharesQuery.data?.memberShares ?? [])
        .map((member) => ({
          ...member,
          visibleShare:
            selectedCategoryKey == null
              ? (member.shares[selectedCurrency] ?? 0)
              : (member.categorySharesByCurrency[selectedCurrency]?.[
                  selectedCategoryKey
                ] ?? 0),
        }))
        .filter((member) => Math.abs(member.visibleShare) > 0)
        .sort((left, right) => {
          if (left.isCurrentUser !== right.isCurrentUser) {
            return left.isCurrentUser ? -1 : 1;
          }

          return right.visibleShare - left.visibleShare;
        }),
    [
      reportsSharesQuery.data?.memberShares,
      selectedCategoryKey,
      selectedCurrency,
    ],
  );
  const categoryTotal =
    reportsTotalsQuery.data?.totalsByCurrency[selectedCurrency] ?? 0;
  const expenseCount =
    reportsTotalsQuery.data?.expenseCountByCurrency[selectedCurrency] ?? 0;
  const currentUserSpent =
    reportsTotalsQuery.data?.currentUserSpentByCurrency[selectedCurrency] ?? 0;
  const chartConfig = useMemo(
    () =>
      categoryBreakdown.reduce<
        Record<string, { label: string; color: string }>
      >((accumulator, entry) => {
        accumulator[entry.name] = {
          label: entry.name,
          color: entry.fill,
        };
        return accumulator;
      }, {}),
    [categoryBreakdown],
  );
  const totalsRangeOptions: Array<{
    label: string;
    value: ReportDateFilterMode;
  }> = [
    { label: t.reports.rangeAll, value: 'all' },
    { label: 'Día', value: 'day' },
    { label: 'Rango', value: 'range' },
  ];
  useEffect(() => {
    if (availableCurrencies.length === 0) return;
    if (availableCurrencies.includes(selectedCurrency)) return;

    setSelectedCurrency(availableCurrencies[0] ?? 'COP');
  }, [availableCurrencies, selectedCurrency]);

  useEffect(() => {
    if (selectedCategoryKey == null) return;
    if (
      categoryBreakdown.some((category) => category.key === selectedCategoryKey)
    )
      return;

    setSelectedCategoryKey(null);
  }, [categoryBreakdown, selectedCategoryKey]);

  if (groupQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#fafafa] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl items-center justify-center bg-[#fafafa] px-4">
          <p className="text-sm text-[#64748b]">{t.reports.loading}</p>
        </div>
      </main>
    );
  }

  if (groupQuery.isError || !group) {
    return (
      <main className="min-h-screen bg-[#fafafa] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col justify-center bg-[#fafafa] px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : t.reports.noAccess}
          </div>
        </div>
      </main>
    );
  }

  return (
    <MobilePageLayout
      title={t.reports.title}
      onBack={() => navigateToGroupRoot(true)}
    >
      <div className="flex flex-1 flex-col pb-28">
        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-2 gap-1 rounded-[20px] bg-[#eef2f7] p-1">
            <button
              type="button"
              onClick={() =>
                void navigate({
                  search: (current) => ({
                    ...current,
                    tab: 'balance',
                  }),
                  replace: true,
                  state: flowState,
                })
              }
              className={[
                'inline-flex h-10 items-center justify-center rounded-[16px] text-sm font-semibold transition-colors',
                activeTab === 'balance'
                  ? 'bg-white text-[#132238] shadow-[0_4px_14px_rgba(15,23,42,0.08)]'
                  : 'text-[#64748b]',
              ].join(' ')}
            >
              {t.reports.balance}
            </button>
            <button
              type="button"
              onClick={() =>
                void navigate({
                  search: (current) => ({
                    ...current,
                    tab: 'totales',
                  }),
                  replace: true,
                  state: flowState,
                })
              }
              className={[
                'inline-flex h-10 items-center justify-center rounded-[16px] text-sm font-semibold transition-colors',
                activeTab === 'totales'
                  ? 'bg-white text-[#132238] shadow-[0_4px_14px_rgba(15,23,42,0.08)]'
                  : 'text-[#64748b]',
              ].join(' ')}
            >
              {t.reports.totals}
            </button>
          </div>
        </section>

        {activeTab === 'balance' ? (
          <GroupReportBalanceTab
            group={group}
            sortedBalanceMembers={sortedBalanceMembers}
            t={t}
            onSettleDebts={() => {
              void navigate({
                to: '/groups/$id/settle',
                params: { id },
                search: { settlementExpenseId: undefined },
                state: flowState,
              });
            }}
          />
        ) : (
          <GroupReportTotalsTab
            group={group}
            t={t}
            expenseCount={expenseCount}
            dateFilterMode={dateFilterMode}
            totalsRangeOptions={totalsRangeOptions}
            selectedDay={selectedDay}
            rangeStartDate={rangeStartDate}
            rangeEndDate={rangeEndDate}
            onDateFilterModeChange={setDateFilterMode}
            onSelectedDayChange={setSelectedDay}
            onRangeStartDateChange={setRangeStartDate}
            onRangeEndDateChange={setRangeEndDate}
            availableCurrencies={availableCurrencies}
            selectedCurrency={selectedCurrency}
            onSelectedCurrencyChange={setSelectedCurrency}
            reportsTotalsLoading={reportsTotalsQuery.isLoading}
            chartConfig={chartConfig}
            categoryBreakdown={categoryBreakdown}
            categoryTotal={categoryTotal}
            selectedCategoryKey={selectedCategoryKey}
            onSelectedCategoryKeyChange={setSelectedCategoryKey}
            currentUserSpent={currentUserSpent}
            selectedCategory={selectedCategory}
            sortedShareMembers={sortedShareMembers}
            onSeeAll={() => {
              void navigate({
                to: '/groups/$id',
                params: { id },
                state: flowState,
              });
            }}
            onOpenMember={(memberId) => {
              void navigate({
                to: '/groups/$id/member/$memberId',
                params: { id, memberId },
                search: {
                  categoryId: selectedCategory?.id ?? undefined,
                  categoryName: selectedCategory?.name ?? undefined,
                  uncategorized:
                    selectedCategory != null && selectedCategory.id == null,
                  paidOnly: false,
                  startDate:
                    reportFilter.range === 'custom'
                      ? reportFilter.startDate
                      : undefined,
                  endDate:
                    reportFilter.range === 'custom'
                      ? reportFilter.endDate
                      : undefined,
                },
                state: flowState,
              });
            }}
          />
        )}
      </div>
    </MobilePageLayout>
  );
}
