import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import {
  formatMoney,
  getInitials,
} from '../-components/group-detail.utils';

export const Route = createFileRoute('/_authed/groups/$id/reports/')({
  component: RouteComponent,
});

type ReportTab = 'balance' | 'totales';

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const groupQuery = useGroupSummaryQuery(id);
  const [activeTab, setActiveTab] = useState<ReportTab>('balance');
  const group = groupQuery.data;
  const sortedMembers = useMemo(
    () =>
      [...(group?.memberBalances ?? [])].sort((left, right) => {
        if (left.isCurrentUser === right.isCurrentUser) return 0;
        return left.isCurrentUser ? -1 : 1;
      }),
    [group?.memberBalances],
  );

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
          <section className="mt-4 rounded-3xl border border-dashed border-[#e2e8f0] bg-white px-4 py-14 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <h2 className="text-base font-semibold text-[#132238]">
              Totales en construcción
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              Por ahora solo está disponible la vista de balance. Más adelante
              aquí se mostrará el total por moneda y por participante.
            </p>
          </section>
        )}
      </div>
    </MobilePageLayout>
  );
}
