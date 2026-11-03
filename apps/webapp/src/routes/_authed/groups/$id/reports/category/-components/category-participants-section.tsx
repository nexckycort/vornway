import { formatCurrency } from '#/lib/i18n';
import { getInitials } from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { GroupSummary } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import type { ParticipantShare } from '../../-lib/participant-share.types';

type Messages = ReturnType<typeof getGroupDetailMessages>;

type CategoryParticipantsSectionProps = {
  t: Messages;
  members: GroupSummary['members'] | undefined;
  shares: ParticipantShare[];
  currency: string;
};

export function CategoryParticipantsSection({
  t,
  members,
  shares: visibleParticipantShares,
  currency,
}: CategoryParticipantsSectionProps) {
  return (
    <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#132238]">
            {t.reports.participants}
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            {t.reports.peopleCount(visibleParticipantShares.length)}
          </p>
        </div>
      </div>

      {visibleParticipantShares.length === 0 ? (
        <p className="rounded-2xl bg-[#f8fafc] px-4 py-4 text-sm text-[#64748b]">
          {t.reports.categoryNoParticipants}
        </p>
      ) : (
        <div className="space-y-3">
          {visibleParticipantShares.map((member) => {
            const memberIdentity = members?.find(
              (item) => item.id === member.memberId,
            );

            return (
              <div
                key={member.memberId}
                className="flex items-center gap-3 rounded-2xl bg-[#f8fafc] px-3 py-3"
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
                        ({t.reports.you})
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-[#64748b]">
                    {memberIdentity?.email ?? t.reports.unlinked}
                  </p>
                </div>

                <p className="text-sm font-semibold text-[#132238]">
                  {formatCurrency(currency, member.visibleShare)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
