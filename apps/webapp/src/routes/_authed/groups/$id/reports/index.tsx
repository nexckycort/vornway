import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart } from 'recharts';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { ChartContainer } from '#/components/ui/chart';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import {
  useGroupReportsSharesQuery,
  useGroupReportsTotalsQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import { CategoryIcon } from '../-components/category-icon';
import { formatMoney, getInitials } from '../-components/group-detail.utils';

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

const CURRENCY_META: Record<string, { flag: string; label: string }> = {
  COP: { flag: '🇨🇴', label: 'COP' },
  USD: { flag: '🇺🇸', label: 'USD' },
  EUR: { flag: '🇪🇺', label: 'EUR' },
  GBP: { flag: '🇬🇧', label: 'GBP' },
  MXN: { flag: '🇲🇽', label: 'MXN' },
  BRL: { flag: '🇧🇷', label: 'BRL' },
};

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
        startDate: selectedDay,
        endDate: selectedDay,
      };
    }

    if (dateFilterMode === 'range') {
      return {
        range: 'custom' as const,
        startDate: rangeStartDate,
        endDate: rangeEndDate,
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
          <>
            <section className="mb-3 mt-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
                  {t.reports.balanceTitle}
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  {t.reports.balanceCopy}
                </p>
              </div>
            </section>

            <section className="flex flex-1 flex-col gap-2">
              {sortedBalanceMembers.map((member) => {
                const memberIdentity = group.members.find(
                  (item) => item.id === member.memberId,
                );
                const entries = Object.entries(member.balances).filter(
                  ([, amount]) => Math.abs(amount) >= 1,
                );
                const isCreator = group.ownerId === memberIdentity?.userId;

                return (
                  <article
                    key={member.memberId}
                    className="rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      {memberIdentity?.image ? (
                        <img
                          src={memberIdentity.image}
                          alt={member.name}
                          className="size-11 shrink-0 rounded-full border border-[#e5e7eb] object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#132238]">
                          {getInitials(member.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#132238]">
                          {member.name}
                          {member.isCurrentUser ? (
                            <span className="ml-1 text-xs text-[#94a3b8]">
                              ({t.reports.you})
                            </span>
                          ) : null}
                          {isCreator ? (
                            <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              {t.reports.owner}
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-[#64748b]">
                          {memberIdentity?.email ?? t.reports.unlinked}
                        </p>
                      </div>
                    </div>

                    {entries.length > 0 ? (
                      <div className="space-y-2">
                        {entries.map(([currency, amount]) => (
                          <div
                            key={currency}
                            className="flex items-center gap-2 rounded-2xl bg-[#f8fafc] px-4 py-3"
                          >
                            {amount > 0 ? (
                              <ArrowUpRight className="size-4 shrink-0 text-rose-600" />
                            ) : (
                              <ArrowDownLeft className="size-4 shrink-0 text-emerald-600" />
                            )}
                            <p className="min-w-0 flex-1 text-sm text-[#334155]">
                              {amount > 0
                                ? t.reports.owesYou(
                                    formatMoney(currency, Math.abs(amount)),
                                  )
                                : t.reports.youOwe(
                                    formatMoney(currency, Math.abs(amount)),
                                  )}
                            </p>
                            <span
                              className={
                                amount > 0
                                  ? 'text-sm font-semibold text-rose-600'
                                  : 'text-sm font-semibold text-emerald-600'
                              }
                            >
                              {amount > 0 ? '+' : ''}
                              {formatMoney(currency, amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
                        {t.reports.noMovements}
                      </p>
                    )}
                  </article>
                );
              })}
            </section>

            <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[412px] md:max-w-5xl border-t border-[#e2e8f0] bg-gradient-to-t from-white via-white to-white/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <Button
                type="button"
                className="h-12 w-full rounded-full bg-gray-950 text-base font-medium text-white hover:bg-gray-950/90"
                onClick={() =>
                  void navigate({
                    to: '/groups/$id/settle',
                    params: { id },
                    search: { settlementExpenseId: undefined },
                    state: flowState,
                  })
                }
              >
                {t.reports.settleDebts}
              </Button>
            </div>
          </>
        ) : (
          <>
            <section className="mt-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
                  {t.reports.expensesTitle}
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  {expenseCount
                    ? t.reports.expensesCount(expenseCount)
                    : t.reports.noExpensesPeriod}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                onClick={() =>
                  void navigate({
                    to: '/groups/$id',
                    params: { id },
                    state: flowState,
                  })
                }
              >
                {t.reports.seeAll}
                <ChevronRight className="size-4" />
              </button>
            </section>

            <section className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {totalsRangeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDateFilterMode(option.value)}
                    className={[
                      'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      dateFilterMode === option.value
                        ? 'bg-primary text-white'
                        : 'border border-[#e2e8f0] bg-white text-[#64748b]',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {dateFilterMode === 'day' ? (
                <div className="mt-3">
                  <label
                    htmlFor="report-day-filter"
                    className="block text-xs font-medium text-[#64748b]"
                  >
                    Fecha
                  </label>
                  <input
                    id="report-day-filter"
                    type="date"
                    value={selectedDay}
                    onChange={(event) => setSelectedDay(event.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#132238] outline-none transition focus:border-primary"
                  />
                </div>
              ) : null}
              {dateFilterMode === 'range' ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="report-range-start"
                      className="block text-xs font-medium text-[#64748b]"
                    >
                      Desde
                    </label>
                    <input
                      id="report-range-start"
                      type="date"
                      value={rangeStartDate}
                      max={rangeEndDate}
                      onChange={(event) =>
                        setRangeStartDate(event.target.value)
                      }
                      className="mt-1 h-11 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#132238] outline-none transition focus:border-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="report-range-end"
                      className="block text-xs font-medium text-[#64748b]"
                    >
                      Hasta
                    </label>
                    <input
                      id="report-range-end"
                      type="date"
                      value={rangeEndDate}
                      min={rangeStartDate}
                      onChange={(event) => setRangeEndDate(event.target.value)}
                      className="mt-1 h-11 w-full rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm text-[#132238] outline-none transition focus:border-primary"
                    />
                  </div>
                </div>
              ) : null}
            </section>

            <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {availableCurrencies.map((currency) => {
                  const meta = CURRENCY_META[currency] ?? {
                    flag: '💱',
                    label: currency,
                  };

                  return (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => setSelectedCurrency(currency)}
                      className={[
                        'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                        selectedCurrency === currency
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-[#e2e8f0] bg-white text-[#64748b]',
                      ].join(' ')}
                    >
                      <span className="text-sm leading-none">{meta.flag}</span>
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-center">
                {reportsTotalsQuery.isLoading ? (
                  <div className="flex size-56 items-center justify-center rounded-full border border-dashed border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#94a3b8]">
                    {t.reports.loadingTotals}
                  </div>
                ) : (
                  <ChartContainer className="size-56" config={chartConfig}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="amount"
                        nameKey="name"
                        innerRadius={74}
                        outerRadius={108}
                        paddingAngle={3}
                        stroke="transparent"
                        fill="#94a3b8"
                      />
                    </PieChart>
                  </ChartContainer>
                )}
              </div>

              <div className="mt-3 flex flex-col items-center">
                <p className="text-xs text-[#94a3b8]">{t.reports.totalGroup}</p>
                {reportsTotalsQuery.isLoading ? (
                  <p className="mt-1 text-2xl font-semibold text-[#132238]">
                    …
                  </p>
                ) : (
                  <p className="mt-1 text-2xl font-semibold text-[#132238]">
                    {formatMoney(selectedCurrency, categoryTotal)}
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryKey(null)}
                  className={[
                    'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                    selectedCategoryKey == null
                      ? 'border-primary/20 bg-primary/10 text-primary'
                      : 'border-[#e2e8f0] bg-white text-[#334155]',
                  ].join(' ')}
                >
                  Todas
                </button>
                {categoryBreakdown.map((entry) => (
                  <button
                    type="button"
                    key={entry.key}
                    onClick={() =>
                      setSelectedCategoryKey((current) =>
                        current === entry.key ? null : entry.key,
                      )
                    }
                    className={[
                      'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                      selectedCategoryKey === entry.key
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-[#e2e8f0] bg-white text-[#334155]',
                    ].join(' ')}
                  >
                    <span
                      className="flex size-7 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${entry.fill}1f`,
                        color: entry.fill,
                      }}
                    >
                      <CategoryIcon
                        icon={entry.icon}
                        color={entry.fill}
                        fallback={
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: entry.fill }}
                          />
                        }
                        className="size-3.5"
                      />
                    </span>
                    {entry.name}
                    <span className="text-[#64748b]">
                      {formatMoney(selectedCurrency, entry.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3">
              <div className="min-w-0 rounded-[24px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-medium text-[#64748b]">
                  {t.reports.totalGroup}
                </p>
                {reportsTotalsQuery.isLoading ? (
                  <p className="mt-1 break-all text-xl font-semibold leading-tight text-[#132238] sm:text-2xl">
                    …
                  </p>
                ) : (
                  <p className="mt-1 break-all text-xl font-semibold leading-tight text-[#132238] sm:text-2xl">
                    {formatMoney(selectedCurrency, categoryTotal)}
                  </p>
                )}
              </div>

              <div className="min-w-0 rounded-[24px] bg-[#111111] p-4 text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
                <p className="text-xs font-medium text-white/70">
                  {t.reports.yourShare}
                </p>
                <p className="mt-1 break-all text-xl font-semibold leading-tight sm:text-2xl">
                  {formatMoney(selectedCurrency, currentUserSpent)}
                </p>
              </div>
            </section>

            <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#132238]">
                    {t.reports.participants}
                  </h3>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {selectedCategory
                      ? `${selectedCategory.name} · ${selectedCurrency}`
                      : `Parte en ${selectedCurrency}`}
                  </p>
                  {selectedCategory ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: selectedCategory.fill }}
                        />
                        Filtrando por {selectedCategory.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryKey(null)}
                        className="text-[11px] font-medium text-[#64748b] underline underline-offset-2"
                      >
                        Ver todas
                      </button>
                    </div>
                  ) : null}
                </div>
                <span className="text-xs text-[#94a3b8]">
                  {t.reports.peopleCount(sortedShareMembers.length)}
                </span>
              </div>

              <div className="space-y-3">
                {sortedShareMembers.map((member) => {
                  const memberIdentity = group.members.find(
                    (item) => item.id === member.memberId,
                  );
                  const amount = member.visibleShare;
                  const isCreator = group.ownerId === memberIdentity?.userId;

                  return (
                    <button
                      type="button"
                      key={member.memberId}
                      onClick={() =>
                        void navigate({
                          to: '/groups/$id/member/$memberId',
                          params: { id, memberId: member.memberId },
                          search: {
                            categoryId: selectedCategory?.id ?? undefined,
                            categoryName: selectedCategory?.name ?? undefined,
                            uncategorized:
                              selectedCategory != null &&
                              selectedCategory.id == null,
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
                        })
                      }
                      className="native-tap flex w-full items-center gap-3 rounded-2xl bg-[#f8fafc] px-3 py-2.5 text-left transition-colors hover:bg-[#eef2f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/15"
                    >
                      {memberIdentity?.image ? (
                        <img
                          src={memberIdentity.image}
                          alt={member.name}
                          className="size-10 shrink-0 rounded-full border border-[#e5e7eb] object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-sm font-semibold text-[#132238]">
                          {getInitials(member.name)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#132238]">
                          {member.name}
                          {member.isCurrentUser ? (
                            <span className="ml-1 text-xs text-[#94a3b8]">
                              (tú)
                            </span>
                          ) : null}
                          {isCreator ? (
                            <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Dueño
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-[#64748b]">
                          {memberIdentity?.email ?? 'Sin cuenta vinculada'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <p className="text-sm font-semibold text-[#132238]">
                            {formatMoney(selectedCurrency, amount)}
                          </p>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-[#94a3b8]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </MobilePageLayout>
  );
}
