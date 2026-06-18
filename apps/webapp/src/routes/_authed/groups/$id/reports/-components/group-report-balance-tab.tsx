import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

import { Button } from '#/components/ui/button';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import { formatMoney, getInitials } from '../../-components/group-detail.utils';
import type { GroupSummary } from '../../-types/group-detail.types';

type BalanceMember = {
  memberId: string;
  name: string;
  isCurrentUser: boolean;
  balances: Record<string, number>;
};

type GroupReportBalanceTabProps = {
  group: GroupSummary;
  sortedBalanceMembers: BalanceMember[];
  t: ReturnType<typeof getGroupDetailMessages>;
  onSettleDebts: () => void;
};

export function GroupReportBalanceTab({
  group,
  sortedBalanceMembers,
  t,
  onSettleDebts,
}: GroupReportBalanceTabProps) {
  return (
    <>
      <section className="mb-3 mt-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
            {t.reports.balanceTitle}
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">{t.reports.balanceCopy}</p>
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
          onClick={onSettleDebts}
        >
          {t.reports.settleDebts}
        </Button>
      </div>
    </>
  );
}
