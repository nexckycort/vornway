import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import {
  useGroupExpensesInfiniteQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import {
  formatMoney,
  getInitials,
} from '../-components/group-detail.utils';

export const Route = createFileRoute('/_authed/groups/$id/reports/')({
  component: RouteComponent,
});

type ReportTab = 'balance' | 'totales';
type TotalsRange = 'all' | 7 | 15 | 30;

type CategoryTotalsEntry = {
  name: string;
  amount: number;
  color: string;
};

const TOTALS_RANGE_OPTIONS: Array<{ label: string; value: TotalsRange }> = [
  { label: 'Todo el periodo', value: 'all' },
  { label: 'Hace 7 días', value: 7 },
  { label: 'Hace 15 días', value: 15 },
  { label: 'Hace 30 días', value: 30 },
];

const CATEGORY_COLORS = [
  '#ff7fa3',
  '#f6c15b',
  '#8dd3ff',
  '#7ddfa8',
  '#c4a6ff',
  '#ffae63',
];

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const groupQuery = useGroupSummaryQuery(id);
  const expensesQuery = useGroupExpensesInfiniteQuery(id);
  const [activeTab, setActiveTab] = useState<ReportTab>('balance');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('COP');
  const [selectedRange, setSelectedRange] = useState<TotalsRange>('all');
  const group = groupQuery.data;
  const allExpenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [expensesQuery.data],
  );
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>();

    for (const entry of Object.keys(group?.totals ?? {})) {
      currencies.add(entry);
    }

    for (const expense of allExpenses) {
      currencies.add(expense.currency);
    }

    return Array.from(currencies);
  }, [allExpenses, group?.totals]);
  const sortedMembers = useMemo(
    () =>
      [...(group?.memberBalances ?? [])].sort((left, right) => {
        if (left.isCurrentUser === right.isCurrentUser) return 0;
        return left.isCurrentUser ? -1 : 1;
      }),
    [group?.memberBalances],
  );
  const currentUserBalance = useMemo(() => {
    if (!group) return 0;

    const currentUserMember = group.memberBalances.find(
      (member) => member.isCurrentUser,
    );

    return currentUserMember?.balances[selectedCurrency] ?? 0;
  }, [group, selectedCurrency]);
  const filteredTotalsExpenses = useMemo(() => {
    const cutoff =
      selectedRange === 'all' ? null : getDaysAgoStart(selectedRange);

    return allExpenses.filter((expense) => {
      if (expense.isDeleted || expense.isSettlement) return false;
      if (expense.currency !== selectedCurrency) return false;

      const expenseDate = new Date(expense.date);
      if (Number.isNaN(expenseDate.getTime())) return false;

      if (cutoff === null) return true;

      return expenseDate.getTime() >= cutoff;
    });
  }, [allExpenses, selectedCurrency, selectedRange]);
  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();

    for (const expense of filteredTotalsExpenses) {
      const categoryName = expense.category?.name?.trim() || 'Sin categoría';
      totals.set(
        categoryName,
        (totals.get(categoryName) ?? 0) + expense.amount,
      );
    }

    return Array.from(totals.entries())
      .map(([name, amount], index) => ({
        name,
        amount,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? '#94a3b8',
      }))
      .sort((left, right) => right.amount - left.amount);
  }, [filteredTotalsExpenses]);
  const categoryTotal = useMemo(
    () => categoryBreakdown.reduce((sum, item) => sum + item.amount, 0),
    [categoryBreakdown],
  );
  const chartGradient = useMemo(
    () => buildConicGradient(categoryBreakdown),
    [categoryBreakdown],
  );
  useEffect(() => {
    if (availableCurrencies.length === 0) return;
    if (availableCurrencies.includes(selectedCurrency)) return;

    setSelectedCurrency(availableCurrencies[0] ?? 'COP');
  }, [availableCurrencies, selectedCurrency]);

  useEffect(() => {
    if (activeTab !== 'totales') return;
    if (!expensesQuery.hasNextPage || expensesQuery.isFetchingNextPage) return;

    void expensesQuery.fetchNextPage();
  }, [
    activeTab,
    expensesQuery.fetchNextPage,
    expensesQuery.hasNextPage,
    expensesQuery.isFetchingNextPage,
  ]);

  if (groupQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#fafafa] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] items-center justify-center bg-[#fafafa] px-4">
          <p className="text-sm text-[#64748b]">Cargando reportes...</p>
        </div>
      </main>
    );
  }

  if (groupQuery.isError || !group) {
    return (
      <main className="min-h-screen bg-[#fafafa] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col justify-center bg-[#fafafa] px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : 'No tienes acceso a este grupo'}
          </div>
        </div>
      </main>
    );
  }

  return (
    <MobilePageLayout
      title="Reportes"
      onBack={() =>
        navigate({ to: '/groups/$id', params: { id }, replace: true })
      }
    >
      <div className="flex flex-1 flex-col pb-28">
        <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="grid grid-cols-2 gap-1 rounded-[20px] bg-[#eef2f7] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('balance')}
              className={[
                'inline-flex h-10 items-center justify-center rounded-[16px] text-sm font-semibold transition-colors',
                activeTab === 'balance'
                  ? 'bg-white text-[#132238] shadow-[0_4px_14px_rgba(15,23,42,0.08)]'
                  : 'text-[#64748b]',
              ].join(' ')}
            >
              Balance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('totales')}
              className={[
                'inline-flex h-10 items-center justify-center rounded-[16px] text-sm font-semibold transition-colors',
                activeTab === 'totales'
                  ? 'bg-white text-[#132238] shadow-[0_4px_14px_rgba(15,23,42,0.08)]'
                  : 'text-[#64748b]',
              ].join(' ')}
            >
              Totales
            </button>
          </div>
        </section>

        {activeTab === 'balance' ? (
          <>
            <section className="mb-3 mt-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
                  Balance por participante
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  Te deben / debes, separado por persona.
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
                              {amount > 0 ? 'Le debes ' : 'Te debe '}
                              <span
                                className={
                                  amount > 0
                                    ? 'font-semibold text-emerald-600'
                                    : 'font-semibold text-rose-600'
                                }
                              >
                                {formatMoney(currency, Math.abs(amount))}
                              </span>
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
                        Sin movimientos
                      </p>
                    )}
                  </article>
                );
              })}
            </section>

            <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-[412px] border-t border-[#e2e8f0] bg-gradient-to-t from-white via-white to-white/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <Button
                type="button"
                className="h-12 w-full rounded-full bg-black text-base font-medium text-white hover:bg-black/90"
                onClick={() =>
                  void navigate({
                    to: '/groups/$id/settle',
                    params: { id },
                  })
                }
              >
                Liquidar deudas
              </Button>
            </div>
          </>
        ) : (
          <>
            <section className="mt-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
                  Gastos
                </h2>
                <p className="mt-1 text-xs text-[#64748b]">
                  {filteredTotalsExpenses.length > 0
                    ? `${filteredTotalsExpenses.length} gastos en ${selectedCurrency}`
                    : 'Sin gastos para este periodo'}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary"
                onClick={() =>
                  void navigate({ to: '/groups/$id', params: { id } })
                }
              >
                Ver todo
                <ChevronRight className="size-4" />
              </button>
            </section>

            <section className="mt-4">
              <div className="flex gap-2 overflow-x-auto pb-1">
              {TOTALS_RANGE_OPTIONS.map((option) => (
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
              <div className="flex flex-wrap gap-2">
                {availableCurrencies.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => setSelectedCurrency(currency)}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                      selectedCurrency === currency
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'border-[#e2e8f0] bg-white text-[#64748b]',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'size-2.5 rounded-full',
                        selectedCurrency === currency
                          ? 'bg-primary'
                          : 'bg-[#cbd5e1]',
                      ].join(' ')}
                    />
                    {currency}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm font-medium text-[#132238]">
                Gastos en {selectedCurrency}
              </p>

              <div className="flex items-center justify-center">
                <div
                  className="relative mt-3 flex size-56 items-center justify-center rounded-full"
                  style={{
                    background: chartGradient || '#f1f5f9',
                  }}
                >
                  <div className="flex size-[14.5rem] flex-col items-center justify-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgba(226,232,240,0.85)]">
                    <p className="text-xs text-[#94a3b8]">Total grupo</p>
                    <p className="mt-1 text-2xl font-semibold text-[#132238]">
                      {formatMoney(selectedCurrency, categoryTotal)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {categoryBreakdown.slice(0, 4).map((entry) => (
                  <span
                    key={entry.name}
                    className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#334155]"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
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
                <p className="text-xs font-medium text-[#64748b]">Total grupo</p>
                <p className="mt-1 text-2xl font-semibold text-[#132238]">
                  {formatMoney(selectedCurrency, categoryTotal)}
                </p>
              </div>

              <div className="rounded-[24px] bg-[#111111] p-4 text-white shadow-[0_8px_24px_rgba(15,23,42,0.14)]">
                <p className="text-xs font-medium text-white/70">Tu parte</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatMoney(
                    selectedCurrency,
                    Math.abs(currentUserBalance),
                  )}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {currentUserBalance > 0
                    ? 'Te deben'
                    : currentUserBalance < 0
                      ? 'Debes'
                      : 'Sin balance'}
                </p>
              </div>
            </section>

            <section className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#132238]">
                    Participantes
                  </h3>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Balance en {selectedCurrency}
                  </p>
                </div>
                <span className="text-xs text-[#94a3b8]">
                  {group.memberBalances.length} personas
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

            {expensesQuery.isFetchingNextPage ? (
              <p className="mt-3 text-center text-sm text-[#64748b]">
                Cargando más...
              </p>
            ) : null}
          </>
        )}
      </div>
    </MobilePageLayout>
  );
}

function getDaysAgoStart(days: Exclude<TotalsRange, 'all'>) {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (days - 1),
  ).getTime();
}

function buildConicGradient(entries: CategoryTotalsEntry[]) {
  if (entries.length === 0) return '';

  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  if (total <= 0) return '';

  let cursor = 0;
  const segments = entries.map((entry) => {
    const start = cursor;
    const segmentSize = (entry.amount / total) * 100;
    cursor += segmentSize;
    return `${entry.color} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${segments.join(', ')})`;
}
