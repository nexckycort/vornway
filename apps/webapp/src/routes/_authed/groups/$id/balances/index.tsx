import { MobilePageLayout } from '#/components/mobile-page-layout';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

import { useGroupSummaryQuery } from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { formatMoney, getInitials, sumByCurrency } from '../-components/group-detail.utils';

export const Route = createFileRoute('/_authed/groups/$id/balances/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const groupQuery = useGroupSummaryQuery(id);

  if (groupQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#efefef] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] items-center justify-center bg-[#fafafa] px-4">
          <p className="text-sm text-[#64748b]">Cargando balance...</p>
        </div>
      </main>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <main className="min-h-screen bg-[#efefef] text-foreground">
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

  const group = groupQuery.data;
  const totalsEntries = Object.entries(group.totals).filter(
    ([, amount]) => Math.abs(amount) >= 0.01,
  );
  const creditEntries = Object.entries(
    sumByCurrency(group.directCredits),
  ).filter(([, amount]) => amount > 0);
  const debtEntries = Object.entries(sumByCurrency(group.directDebts)).filter(
    ([, amount]) => amount > 0,
  );
  return (
    <MobilePageLayout
      title="Balance"
      onBack={() =>
        navigate({ to: '/groups/$id', params: { id }, replace: true })
      }
    >
      <section className="mb-5 rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#132238]">
              {group.name}
            </p>
            <p className="text-xs text-[#64748b]">
              {group.participantCount} participantes
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#f8fafc] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#94a3b8]">
              Te deben
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">
              {creditEntries.length > 0
                ? formatMoney(creditEntries[0][0], creditEntries[0][1])
                : 'Sin balance'}
            </p>
          </div>

          <div className="rounded-2xl bg-[#f8fafc] px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#94a3b8]">
              Debes
            </p>
            <p className="mt-1 text-sm font-semibold text-rose-600">
              {debtEntries.length > 0
                ? formatMoney(debtEntries[0][0], debtEntries[0][1])
                : 'Sin balance'}
            </p>
          </div>
        </div>

        {totalsEntries.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {totalsEntries.map(([currency, amount]) => (
              <span
                key={currency}
                className="inline-flex rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-medium text-[#475569]"
              >
                {formatMoney(currency, Math.abs(amount))}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
            Resumen por participante
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            Total por persona, separado por moneda.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        {group.memberBalances.map((member) => {
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
              className="rounded-3xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
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
                      <span className="ml-1 text-xs text-[#94a3b8]">(tú)</span>
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

              <div className="mt-4 space-y-2">
                {entries.length > 0 ? (
                  entries.map(([currency, amount]) => (
                    <div
                      key={currency}
                      className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-4 py-3"
                    >
                      <div className="flex items-center gap-2">
                        {amount > 0 ? (
                          <ArrowDownLeft className="size-4 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="size-4 text-rose-600" />
                        )}
                        <span className="text-sm text-[#334155]">
                          {currency}
                        </span>
                      </div>
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
                  ))
                ) : (
                  <p className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
                    Sin movimientos
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </MobilePageLayout>
  );
}
