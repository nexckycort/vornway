import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Pie, PieChart } from 'recharts';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { ChartContainer } from '#/components/ui/chart';
import {
  useGroupReportsTotalsQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import {
  formatMoney,
  getInitials,
} from '../-components/group-detail.utils';

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

const TOTALS_RANGE_OPTIONS: Array<{ label: string; value: TotalsRange }> = [
  { label: 'Todo el periodo', value: 'all' },
  { label: 'Hace 7 días', value: 7 },
  { label: 'Hace 15 días', value: 15 },
  { label: 'Hace 30 días', value: 30 },
];

function RouteComponent() {
  const { id } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
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
  const categoryBreakdown =
    reportsTotalsQuery.data?.categoriesByCurrency[selectedCurrency] ?? [];
  const categoryTotal =
    reportsTotalsQuery.data?.totalsByCurrency[selectedCurrency] ?? 0;
  const expenseCount =
    reportsTotalsQuery.data?.expenseCountByCurrency[selectedCurrency] ?? 0;
  const chartConfig = useMemo(
    () =>
      categoryBreakdown.reduce<Record<string, { label: string; color: string }>>(
        (accumulator, entry) => {
          accumulator[entry.name] = {
            label: entry.name,
            color: entry.fill,
          };
          return accumulator;
        },
        {},
      ),
    [categoryBreakdown],
  );
  useEffect(() => {
    if (availableCurrencies.length === 0) return;
    if (availableCurrencies.includes(selectedCurrency)) return;

    setSelectedCurrency(availableCurrencies[0] ?? 'COP');
  }, [availableCurrencies, selectedCurrency]);

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
              onClick={() =>
                void navigate({
                  search: { tab: 'balance' } as any,
                  replace: true,
                })
              }
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
              onClick={() =>
                void navigate({
                  search: { tab: 'totales' } as any,
                  replace: true,
                })
              }
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
                  {expenseCount
                    ? `${expenseCount} gastos`
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
              <div className="flex gap-2 overflow-x-auto pb-1">
                  {availableCurrencies.map((currency) => (
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

              <div className="mt-3 flex items-center justify-center">
                {reportsTotalsQuery.isLoading ? (
                  <div className="flex aspect-square h-56 w-56 items-center justify-center rounded-full border border-dashed border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#94a3b8]">
                    Cargando totales...
                  </div>
                ) : (
                  <ChartContainer
                    className="aspect-square h-56 w-56"
                    config={chartConfig}
                  >
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
                <p className="text-xs text-[#94a3b8]">Total grupo</p>
                {reportsTotalsQuery.isLoading ? (
                  <p className="mt-1 text-2xl font-semibold text-[#132238]">
                    —
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
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
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
                {reportsTotalsQuery.isLoading ? (
                  <p className="mt-1 text-2xl font-semibold text-[#132238]">
                    —
                  </p>
                ) : (
                  <p className="mt-1 text-2xl font-semibold text-[#132238]">
                    {formatMoney(selectedCurrency, categoryTotal)}
                  </p>
                )}
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

          </>
        )}
      </div>
    </MobilePageLayout>
  );
}
