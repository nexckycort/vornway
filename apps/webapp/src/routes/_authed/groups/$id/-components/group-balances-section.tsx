import type { RefObject } from 'react';
import { getGroupDetailMessages } from '../-messages';
import type { GroupSummary } from '../-types/group-detail.types';
import { formatMoney, getInitials } from './group-detail.utils';

type GroupBalancesSectionProps = {
  group: GroupSummary;
  balanceRef: RefObject<HTMLElement | null>;
};

export function GroupBalancesSection({
  group,
  balanceRef,
}: GroupBalancesSectionProps) {
  const t = getGroupDetailMessages();

  return (
    <section ref={balanceRef} className="scroll-mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
          Saldos
        </h2>
        <span className="text-xs text-[#94a3b8]">
          {group.memberBalances.length} personas
        </span>
      </div>

      {group.memberBalances.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] px-6 py-14 text-center">
          <h3 className="text-base font-semibold text-[#132238]">
            Sin cuentas aún
          </h3>
          <p className="mt-2 text-sm text-[#64748b]">
            Agrega gastos para ver el balance de cada participante.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {group.memberBalances.map((member) => {
            const memberIdentity = group.members.find(
              (item) => item.id === member.memberId,
            );
            const entries = Object.entries(member.balances).filter(
              ([, amount]) => Math.abs(amount) >= 1,
            );

            return (
              <article
                key={member.memberId}
                className="flex items-center gap-4 rounded-3xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
              >
                {memberIdentity?.image ? (
                  <img
                    src={memberIdentity.image}
                    alt={member.name}
                    className="size-12 shrink-0 rounded-full border border-[#e5e7eb] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-base font-semibold text-[#132238]">
                    {getInitials(member.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#132238]">
                    {member.name}
                    {member.isCurrentUser ? (
                      <span className="ml-1 text-xs text-[#94a3b8]">
                        {t.detail.you}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-[#94a3b8]">
                    {memberIdentity?.email ?? 'Sin cuenta vinculada'}
                  </p>
                  {entries.length === 0 ? (
                    <p className="mt-1 text-xs text-[#94a3b8]">
                      Sin movimientos
                    </p>
                  ) : (
                    entries.map(([currency, amount]) => (
                      <p
                        key={currency}
                        className={
                          amount > 0
                            ? 'mt-1 text-xs font-medium text-emerald-600'
                            : 'mt-1 text-xs font-medium text-rose-600'
                        }
                      >
                        {amount > 0
                          ? `Le deben ${formatMoney(currency, amount)}`
                          : `Debe ${formatMoney(currency, Math.abs(amount))}`}
                      </p>
                    ))
                  )}
                </div>
                <div className="max-w-[112px] shrink-0 text-right">
                  {entries.map(([currency, amount]) => (
                    <p
                      key={currency}
                      className={
                        amount > 0
                          ? 'truncate text-sm font-semibold text-emerald-600'
                          : 'truncate text-sm font-semibold text-rose-600'
                      }
                    >
                      {amount > 0 ? '+' : ''}
                      {formatMoney(currency, amount)}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
