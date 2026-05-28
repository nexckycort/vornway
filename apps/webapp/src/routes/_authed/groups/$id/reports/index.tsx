import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart } from 'recharts';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { ChartContainer } from '#/components/ui/chart';
import { useGroupFlowNavigation } from '#/lib/group-flow-navigation';
import {
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

type TotalsRange = 'all' | 7 | 15 | 30;

const CURRENCY_META: Record<string, { flag: string; label: string }> = {
  COP: { flag: '🇨🇴', label: 'COP' },
  USD: { flag: '🇺🇸', label: 'USD' },
  EUR: { flag: '🇪🇺', label: 'EUR' },
  GBP: { flag: '🇬🇧', label: 'GBP' },
  MXN: { flag: '🇲🇽', label: 'MXN' },
  BRL: { flag: '🇧🇷', label: 'BRL' },
};

function RouteComponent() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const t = getGroupDetailMessages();
  const navigate = useNavigate({ from: Route.fullPath });
  const { flowState, navigateToGroupRoot } = useGroupFlowNavigation(id);
  const groupQuery = useGroupSummaryQuery(id);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('COP');
  const [selectedRange, setSelectedRange] = useState<TotalsRange>('all');
  const activeTab = tab;
  const group = groupQuery.data;
  const reportsTotalsQuery = useGroupReportsTotalsQuery(
    id,
    selectedRange,
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
  const sortedMembers = useMemo(
    () =>
      Array.from(group?.memberBalances ?? []).sort((left, right) => {
        if (left.isCurrentUser === right.isCurrentUser) return 0;
        return left.isCurrentUser ? -1 : 1;
      }),
    [group?.memberBalances],
  );
  const categoryBreakdown =
    reportsTotalsQuery.data?.categoriesByCurrency[selectedCurrency] ?? [];
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
  const totalsRangeOptions: Array<{ label: string; value: TotalsRange }> = [
    { label: t.reports.rangeAll, value: 'all' },
    { label: t.reports.range7, value: 7 },
    { label: t.reports.range15, value: 15 },
    { label: t.reports.range30, value: 30 },
  ];
  useEffect(() => {
    if (availableCurrencies.length === 0) return;
    if (availableCurrencies.includes(selectedCurrency)) return;

    setSelectedCurrency(availableCurrencies[0] ?? 'COP');
  }, [availableCurrencies, selectedCurrency]);

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
              {sortedMembers.map((member) => {
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
                              <ArrowDownLeft className="size-4 shrink-0 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="size-4 shrink-0 text-rose-600" />
                            )}
                            <p className="min-w-0 flex-1 text-sm text-[#334155]">
                              {amount > 0
                                ? t.reports.youOwe(
                                    formatMoney(currency, Math.abs(amount)),
                                  )
                                : t.reports.owesYou(
                                    formatMoney(currency, Math.abs(amount)),
                                  )}
                            </p>
                            <span
                              className={
                                amount > 0
                                  ? 'text-sm font-semibold text-emerald-600'
                                  : 'text-sm font-semibold text-rose-600'
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
                    onClick={() => setSelectedRange(option.value)}
                    className={[
                      'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      selectedRange === option.value
                        ? 'bg-primary text-white'
                        : 'border border-[#e2e8f0] bg-white text-[#64748b]',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
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
                {categoryBreakdown.map((entry) => (
                  <span
                    key={entry.name}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#334155]"
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
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-medium text-[#64748b]">
                  {t.reports.totalGroup}
                </p>
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

              <div className="rounded-[24px] bg-[#111111] p-4 text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
                <p className="text-xs font-medium text-white/70">
                  {t.reports.yourShare}
                </p>
                <p className="mt-1 text-2xl font-semibold">
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
                    {t.reports.balanceInCurrency(selectedCurrency)}
                  </p>
                </div>
                <span className="text-xs text-[#94a3b8]">
                  {t.reports.peopleCount(group.memberBalances.length)}
                </span>
              </div>

              <div className="space-y-3">
                {sortedMembers.map((member) => {
                  const memberIdentity = group.members.find(
                    (item) => item.id === member.memberId,
                  );
                  const amount = member.balances[selectedCurrency] ?? 0;
                  const isCreator = group.ownerId === memberIdentity?.userId;

                  return (
                    <div
                      key={member.memberId}
                      className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-3 py-2.5"
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

                      <div className="text-right">
                        <p
                          className={
                            amount > 0
                              ? 'text-sm font-semibold text-emerald-600'
                              : amount < 0
                                ? 'text-sm font-semibold text-rose-600'
                                : 'text-sm font-semibold text-[#64748b]'
                          }
                        >
                          {amount > 0 ? '+' : ''}
                          {formatMoney(selectedCurrency, amount)}
                        </p>
                      </div>
                    </div>
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
