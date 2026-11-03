import { Delete02Icon, SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { formatCurrency } from '#/lib/i18n';
import type { GoalDetailData } from '../../-hooks/use-goal-detail-query';
import { formatDate } from '../../-lib/goal-detail';
import { getGoalsMessages } from '../../-messages';
import { Avatar, EmptyCard, SectionHeader } from './goal-detail-parts';

export type ContributionToDelete = {
  id: string;
  memberName: string;
  amount: number;
  currency: string;
};

export function GoalActivitySection({
  goal,
  isAdmin,
  onDelete,
}: {
  goal: GoalDetailData;
  isAdmin: boolean;
  onDelete: (contribution: ContributionToDelete) => void;
}) {
  const t = getGoalsMessages();
  const recentContributions = goal.contributions.slice(0, 6);

  return (
    <section className="rounded-[30px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <SectionHeader
        title={t.detail.recentActivity}
        copy={t.detail.recentActivityCopy}
        count={t.detail.contributionsCount(goal.contributions.length)}
      />

      {recentContributions.length === 0 ? (
        <EmptyCard
          icon={<HugeiconsIcon icon={SparklesIcon} className="size-5" />}
          title={t.detail.emptyContributions}
          copy={t.detail.emptyContributionsCopy}
        />
      ) : (
        <div className="mt-4 space-y-3">
          {recentContributions.map((contribution) => (
            <article
              key={contribution.id}
              className="flex items-center gap-3 rounded-[22px] bg-[#fafafa] px-3 py-3"
            >
              <Avatar
                name={contribution.member.name}
                image={contribution.member.image}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0f172a]">
                  {contribution.member.name} aportó{' '}
                  {formatCurrency(goal.currency, contribution.amount)}
                </p>
                <p className="text-xs text-[#64748b]">
                  {formatDate(contribution.contributedAt)}
                  {contribution.notes ? ` · ${contribution.notes}` : ''}
                </p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() =>
                    onDelete({
                      id: contribution.id,
                      memberName: contribution.member.name,
                      amount: contribution.amount,
                      currency: goal.currency,
                    })
                  }
                  className="flex size-9 items-center justify-center rounded-full text-red-500"
                  aria-label={t.detail.deleteContributionAria}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
