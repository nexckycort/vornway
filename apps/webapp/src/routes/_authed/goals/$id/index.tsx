import {
  Add01Icon,
  ArrowLeftIcon,
  Edit03Icon,
  Share02Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatCurrency } from '#/lib/i18n';
import { copyText } from '#/lib/native-share';
import { useGoalDetailQuery } from '../-hooks/use-goal-detail-query';
import { formatDate, rankMembers } from '../-lib/goal-detail';
import {
  getContributionModeLabel,
  getDaysLabel,
  getGoalTheme,
} from '../-lib/goal-experience';
import { getGoalsMessages } from '../-messages';
import {
  type ContributionToDelete,
  GoalActivitySection,
} from './-components/goal-activity-section';
import { GoalContributionDrawer } from './-components/goal-contribution-drawer';
import { GoalDeleteContributionDrawer } from './-components/goal-delete-contribution-drawer';
import {
  GoalDetailSkeleton,
  HeaderAction,
  HeroStat,
  InsightCard,
} from './-components/goal-detail-parts';
import { GoalEditDrawer } from './-components/goal-edit-drawer';
import { GoalMembersSection } from './-components/goal-members-section';
import { GoalTimelineSection } from './-components/goal-timeline-section';

export const Route = createFileRoute('/_authed/goals/$id/')({
  validateSearch: (search: Record<string, unknown>) => ({
    from: search.from === 'home' ? ('home' as const) : ('goals' as const),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const t = getGoalsMessages();
  const { id } = Route.useParams();
  const { from } = Route.useSearch();
  const navigate = useNavigate();
  const goalQuery = useGoalDetailQuery(id);
  const goal = goalQuery.data;
  const participantInputRef = useRef<HTMLInputElement | null>(null);

  const [showContributionDrawer, setShowContributionDrawer] = useState(false);
  const [showDeleteContributionDrawer, setShowDeleteContributionDrawer] =
    useState(false);
  const [contributionDefaultDate, setContributionDefaultDate] = useState('');
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [contributionToDelete, setContributionToDelete] =
    useState<ContributionToDelete | null>(null);

  const isAdmin = goal?.myMembership?.role === 'admin';

  const handleBack = () => {
    void navigate({ to: from === 'home' ? '/' : '/goals' });
  };

  const openContributionDrawer = () => {
    setContributionDefaultDate(new Date().toISOString().slice(0, 10));
    setShowContributionDrawer(true);
  };

  const openDeleteContribution = (contribution: ContributionToDelete) => {
    if (!isAdmin) return;
    setContributionToDelete(contribution);
    setShowDeleteContributionDrawer(true);
  };

  if (goalQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#111111] text-foreground">
        <GoalDetailSkeleton />
      </main>
    );
  }

  if (goalQuery.isError || !goal) {
    return (
      <main className="min-h-screen bg-[#efefef] text-foreground">
        <div className="flex min-h-screen w-full flex-col justify-center bg-[#fafafa] px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {goalQuery.error instanceof Error
              ? goalQuery.error.message
              : t.detail.noAccess}
          </div>
        </div>
      </main>
    );
  }

  const theme = getGoalTheme(goal.goalType, goal.themeColor ?? undefined);
  const rankedMembers = rankMembers(goal);
  const membersOnTrack = rankedMembers.filter(
    (member) => member.isOnTrack,
  ).length;
  const pendingMembers = Math.max(0, goal.participantCount - membersOnTrack);

  return (
    <main className="min-h-screen bg-[#111111] text-foreground">
      <div className="flex min-h-screen w-full flex-col bg-[#111111]">
        <header className="px-4 pb-4 pt-5 text-white">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 flex items-start gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
                aria-label={t.detail.backAria}
              >
                <HugeiconsIcon icon={ArrowLeftIcon} className="size-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: theme.soft }}
                  >
                    {goal.emoji || theme.emoji}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold leading-7">
                      {goal.title}
                    </h1>
                    <p className="truncate text-sm text-white/55">
                      {getContributionModeLabel(goal.contributionMode)}
                      {goal.description ? ` · ${goal.description}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setShowEditDrawer(true)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
                  aria-label={t.detail.editAria}
                >
                  <HugeiconsIcon icon={Edit03Icon} className="size-4" />
                </button>
              ) : null}
            </div>

            <section className="rounded-[24px] bg-[#2c2226] px-5 py-4 shadow-[0_18px_35px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-light text-white/80">
                    {t.detail.generalProgress}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {Math.round(goal.progress)}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-light text-white/70">
                    {t.detail.remaining}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {getDaysLabel(goal.daysLeft)}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(4, goal.progress)}%`,
                    backgroundColor: theme.accent,
                  }}
                />
              </div>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-light text-white/70">
                    {t.detail.saved}
                  </p>
                  <p className="text-base font-semibold text-emerald-400">
                    {formatCurrency(goal.currency, goal.savedAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-light text-white/70">
                    {t.detail.objective}
                  </p>
                  <p className="text-base font-semibold text-white">
                    {formatCurrency(goal.currency, goal.targetAmount)}
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <HeroStat
                label={t.detail.thisMonth}
                value={formatCurrency(
                  goal.currency,
                  goal.stats.currentMonthContributionTotal,
                )}
              />
              <HeroStat label={t.detail.onTrack} value={`${membersOnTrack}`} />
              <HeroStat label={t.detail.pending} value={`${pendingMembers}`} />
            </div>

            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {isAdmin ? (
                <HeaderAction
                  icon={<HugeiconsIcon icon={Add01Icon} className="size-5" />}
                  label={t.detail.contribution}
                  primary
                  onClick={openContributionDrawer}
                />
              ) : null}
              <HeaderAction
                icon={<HugeiconsIcon icon={UserGroupIcon} className="size-5" />}
                label={t.detail.invite}
                onClick={() => participantInputRef.current?.focus()}
              />
              <HeaderAction
                icon={<HugeiconsIcon icon={Share02Icon} className="size-5" />}
                label={t.detail.share}
                onClick={() => {
                  void copyText(window.location.href);
                  toast.success('Enlace copiado');
                }}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 rounded-t-[32px] bg-[#fafafa] px-4 pb-28 pt-5 shadow-[0_-16px_40px_rgba(0,0,0,0.12)]">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
            <GoalActivitySection
              goal={goal}
              isAdmin={isAdmin}
              onDelete={openDeleteContribution}
            />

            <GoalMembersSection
              goal={goal}
              rankedMembers={rankedMembers}
              isAdmin={isAdmin}
              inputRef={participantInputRef}
            />

            <GoalTimelineSection goal={goal} />

            <section className="grid gap-3 md:grid-cols-3">
              <InsightCard
                label={t.detail.missing}
                value={formatCurrency(
                  goal.currency,
                  goal.stats.remainingAmount,
                )}
                copy={t.detail.completeCopy}
              />
              <InsightCard
                label={t.detail.average}
                value={formatCurrency(
                  goal.currency,
                  goal.stats.averageContribution,
                )}
                copy={t.detail.perContributionCopy}
              />
              <InsightCard
                label={t.detail.projection}
                value={
                  goal.stats.projectedCompletionDate
                    ? formatDate(goal.stats.projectedCompletionDate)
                    : t.detail.noData
                }
                copy={t.detail.currentPaceCopy}
              />
            </section>
          </div>
        </div>
      </div>

      <GoalContributionDrawer
        goal={goal}
        defaultDate={contributionDefaultDate}
        open={showContributionDrawer}
        onOpenChange={setShowContributionDrawer}
      />

      <GoalEditDrawer
        goal={goal}
        open={showEditDrawer}
        onOpenChange={setShowEditDrawer}
      />

      <GoalDeleteContributionDrawer
        goalId={goal.id}
        contribution={contributionToDelete}
        open={showDeleteContributionDrawer}
        onOpenChange={setShowDeleteContributionDrawer}
        onDeleted={() => setContributionToDelete(null)}
      />
    </main>
  );
}
