import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowLeft,
  Check,
  Edit3,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { useAddMemberMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import { useUserSearchQuery } from '#/routes/_authed/groups/-hooks/use-user-search-query';
import { useAddGoalContributionMutation } from '../-hooks/use-add-goal-contribution';
import { useDeleteGoalContributionMutation } from '../-hooks/use-delete-goal-contribution';
import { useGoalDetailQuery } from '../-hooks/use-goal-detail-query';
import { useUpdateGoalMutation } from '../-hooks/use-update-goal';
import {
  type ContributionMode,
  contributionModes,
  getContributionModeLabel,
  getDaysLabel,
  getGoalTheme,
} from '../-lib/goal-experience';
import { getGoalsMessages } from '../-messages';

export const Route = createFileRoute('/_authed/goals/$id/')({
  component: RouteComponent,
});

const goalDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const goalMonthFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'short',
});

function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return goalDateFormatter.format(date);
}

function toDateInputValue(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function monthLabel(value: Date) {
  return goalMonthFormatter.format(value);
}

const currentMonthDate = new Date();

function buildTimeline(startDate: string | Date, endDate: string | Date) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const months: Array<{ key: string; label: string; date: Date }> = [];

  while (cursor <= last && months.length < 18) {
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: monthLabel(cursor),
      date: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function isMemberOnTrack(input: {
  totalAmount: number;
  savedAmount: number;
  participantCount: number;
}) {
  const { totalAmount, savedAmount, participantCount } = input;
  if (participantCount <= 0) return false;

  const expectedShare = savedAmount / participantCount;
  return totalAmount + 0.01 >= expectedShare;
}

function RouteComponent() {
  const t = getGoalsMessages();
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const goalQuery = useGoalDetailQuery(id);
  const goal = goalQuery.data;
  const addMemberMutation = useAddMemberMutation(goal?.group.id ?? id);
  const addContributionMutation = useAddGoalContributionMutation(id);
  const deleteContributionMutation = useDeleteGoalContributionMutation(id);
  const updateGoalMutation = useUpdateGoalMutation(id);
  const participantInputRef = useRef<HTMLInputElement | null>(null);

  const [participantInput, setParticipantInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showContributionDrawer, setShowContributionDrawer] = useState(false);
  const [showDeleteContributionDrawer, setShowDeleteContributionDrawer] =
    useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [contributionToDelete, setContributionToDelete] = useState<{
    id: string;
    memberName: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [contributionMemberId, setContributionMemberId] = useState('');
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionDate, setContributionDate] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editContributionMode, setEditContributionMode] =
    useState<ContributionMode>('manual');

  const searchQuery = useUserSearchQuery(debouncedSearch);
  const searchResults = searchQuery.data?.data ?? [];
  const isAdmin = goal?.myMembership?.role === 'admin';
  const currentMember =
    goal?.members.find((member) => member.isCurrentUser) ?? null;
  const currentUserIds = useMemo(
    () =>
      new Set(
        goal?.members.flatMap((member) =>
          member.userId ? [member.userId] : [],
        ) ?? [],
      ),
    [goal?.members],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(participantInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [participantInput]);

  useEffect(() => {
    if (!goal) return;
    if (
      contributionMemberId &&
      goal.members.some((member) => member.id === contributionMemberId)
    ) {
      return;
    }

    setContributionMemberId(currentMember?.id ?? goal.members[0]?.id ?? '');
  }, [contributionMemberId, currentMember?.id, goal]);

  useEffect(() => {
    if (!goal || !showEditDrawer) return;
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? '');
    setEditTargetAmount(String(goal.targetAmount));
    setEditEndDate(toDateInputValue(goal.endDate));
    setEditContributionMode(goal.contributionMode as ContributionMode);
  }, [goal, showEditDrawer]);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.replace('/goals');
  };

  const addParticipant = async (participant: {
    name: string;
    linkedUserId?: string;
  }) => {
    if (!goal || addMemberMutation.isPending) return;

    const trimmedName = participant.name.trim();
    if (!trimmedName) return;

    try {
      await addMemberMutation.mutateAsync({
        name: trimmedName,
        ...(participant.linkedUserId
          ? { linkedUserId: participant.linkedUserId }
          : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['goal-detail', id] });
      setParticipantInput('');
      setDebouncedSearch('');
      toast.success(t.detail.memberAdded);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.addGoalParticipantFailed'](),
      );
    }
  };

  const openAddContributionDrawer = () => {
    if (!goal || !isAdmin) return;
    setContributionAmount(
      goal.suggestedContributionAmount
        ? String(Math.round(goal.suggestedContributionAmount))
        : '',
    );
    setContributionDate(new Date().toISOString().slice(0, 10));
    setContributionNotes('');
    setContributionMemberId(currentMember?.id ?? goal.members[0]?.id ?? '');
    setShowContributionDrawer(true);
  };

  const saveContribution = async () => {
    if (
      !goal ||
      !isAdmin ||
      addContributionMutation.isPending ||
      !contributionMemberId
    ) {
      return;
    }

    const amount = Number(contributionAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return;

    try {
      await addContributionMutation.mutateAsync({
        memberId: contributionMemberId,
        amount,
        ...(contributionDate
          ? { contributedAt: new Date(contributionDate) }
          : {}),
        ...(contributionNotes.trim()
          ? { notes: contributionNotes.trim() }
          : {}),
      });
      setShowContributionDrawer(false);
      toast.success(t.detail.contributionAdded);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.addGoalContributionFailed'](),
      );
    }
  };

  const saveGoalChanges = async () => {
    if (!goal || updateGoalMutation.isPending) return;
    const targetAmount = Number(editTargetAmount.replace(',', '.'));
    if (
      !editTitle.trim() ||
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {
      return;
    }

    try {
      await updateGoalMutation.mutateAsync({
        name: editTitle,
        description: editDescription,
        targetAmount,
        endDate: new Date(editEndDate),
        contributionMode: editContributionMode,
      });
      setShowEditDrawer(false);
      toast.success(m['system.goalUpdated']());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : m['system.updateGoalFailed'](),
      );
    }
  };

  const openDeleteContribution = (contribution: {
    id: string;
    memberName: string;
    amount: number;
    currency: string;
  }) => {
    if (!isAdmin) return;
    setContributionToDelete(contribution);
    setShowDeleteContributionDrawer(true);
  };

  const confirmDeleteContribution = async () => {
    if (!contributionToDelete || deleteContributionMutation.isPending) return;

    try {
      await deleteContributionMutation.mutateAsync(contributionToDelete.id);
      setShowDeleteContributionDrawer(false);
      setContributionToDelete(null);
      toast.success(t.detail.contributionDeleted);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m['system.deleteGoalContributionFailed'](),
      );
    }
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
  const timeline = buildTimeline(goal.startDate, goal.endDate);
  const recentContributions = goal.contributions.slice(0, 6);
  const topMembers = [...goal.members]
    .map((member) => {
      const stats = goal.memberStats.find(
        (item) => item.memberId === member.id,
      );
      const amount = stats?.totalAmount ?? 0;

      return {
        member,
        stats,
        amount,
        isOnTrack: isMemberOnTrack({
          totalAmount: amount,
          savedAmount: goal.savedAmount,
          participantCount: goal.participantCount,
        }),
      };
    })
    .sort((left, right) => right.amount - left.amount);
  const membersOnTrack = topMembers.filter((member) => member.isOnTrack).length;
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
                <ArrowLeft className="size-4" />
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
                  <Edit3 className="size-4" />
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
                  icon={<Plus className="size-5" />}
                  label={t.detail.contribution}
                  primary
                  onClick={openAddContributionDrawer}
                />
              ) : null}
              <HeaderAction
                icon={<Users className="size-5" />}
                label={t.detail.invite}
                onClick={() => participantInputRef.current?.focus()}
              />
              <HeaderAction
                icon={<Share2 className="size-5" />}
                label={t.detail.share}
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href);
                  toast.success('Enlace copiado');
                }}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 rounded-t-[32px] bg-[#fafafa] px-4 pb-28 pt-5 shadow-[0_-16px_40px_rgba(0,0,0,0.12)]">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
            <section className="rounded-[30px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <SectionHeader
                title={t.detail.recentActivity}
                copy={t.detail.recentActivityCopy}
                count={t.detail.contributionsCount(goal.contributions.length)}
              />

              {recentContributions.length === 0 ? (
                <EmptyCard
                  icon={<Sparkles className="size-5" />}
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
                            openDeleteContribution({
                              id: contribution.id,
                              memberName: contribution.member.name,
                              amount: contribution.amount,
                              currency: goal.currency,
                            })
                          }
                          className="flex size-9 items-center justify-center rounded-full text-red-500"
                          aria-label={t.detail.deleteContributionAria}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[30px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <SectionHeader
                title={t.detail.members}
                copy={t.detail.membersCopy}
                count={t.detail.peopleCount(goal.participantCount)}
              />

              {isAdmin ? (
                <div className="mt-4">
                  <div className="flex gap-2">
                    <input
                      ref={participantInputRef}
                      value={participantInput}
                      onChange={(event) =>
                        setParticipantInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void addParticipant({ name: participantInput });
                        }
                      }}
                      placeholder={t.detail.peoplePlaceholder}
                      className="h-12 min-w-0 flex-1 rounded-[20px] border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="size-12 rounded-[20px]"
                      disabled={
                        !participantInput.trim() || addMemberMutation.isPending
                      }
                      onClick={() =>
                        void addParticipant({ name: participantInput })
                      }
                      aria-label={t.detail.addParticipantAria}
                    >
                      <UserPlus className="size-5" />
                    </Button>
                  </div>

                  {searchResults.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {searchResults.map((candidate) => {
                        const alreadyMember = currentUserIds.has(candidate.id);

                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            disabled={candidate.isCurrentUser || alreadyMember}
                            onClick={() => {
                              if (candidate.isCurrentUser || alreadyMember)
                                return;
                              void addParticipant({
                                name: candidate.name,
                                linkedUserId: candidate.id,
                              });
                            }}
                            className="flex w-full items-center gap-3 rounded-[20px] border border-[#e2e8f0] bg-[#fafafa] px-3 py-3 text-left disabled:opacity-60"
                          >
                            <Avatar name={candidate.name} image={null} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {candidate.name}
                              </span>
                              <span className="block truncate text-xs text-[#64748b]">
                                {alreadyMember
                                  ? t.detail.alreadyAdded
                                  : candidate.username
                                    ? `@${candidate.username}`
                                    : candidate.email}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {topMembers.map(({ member, amount, isOnTrack }, index) => (
                  <article
                    key={member.id}
                    className="rounded-[24px] border border-[#edf2f7] bg-[#fafafa] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} image={member.image} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0f172a]">
                          {member.name}
                          {member.isCurrentUser ? (
                            <span className="ml-1 text-xs text-[#94a3b8]">
                              {t.detail.you}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-[#64748b]">
                          {isOnTrack
                            ? t.detail.onTrackCopy
                            : t.detail.pendingCopy}
                        </p>
                      </div>
                      {index === 0 && amount > 0 ? (
                        <Trophy className="size-4 text-amber-500" />
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-[#94a3b8]">
                          {t.detail.totalContributed}
                        </p>
                        <p className="text-base font-semibold">
                          {formatCurrency(goal.currency, amount)}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-3 py-1 text-xs font-semibold"
                        style={{
                          color: isOnTrack ? '#059669' : '#e11d48',
                          backgroundColor: isOnTrack ? '#ecfdf5' : '#fff1f2',
                        }}
                      >
                        {isOnTrack ? t.detail.onTrack : t.detail.pending}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <SectionHeader
                title={t.detail.calendar}
                copy={t.detail.calendarCopy}
                count={t.detail.installmentsCount(goal.installmentCount)}
              />
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {timeline.map((item, index) => {
                  const active = item.date <= currentMonthDate;
                  return (
                    <div
                      key={item.key}
                      className="min-w-[92px] rounded-[22px] border border-[#e2e8f0] bg-[#fafafa] p-3"
                    >
                      <div
                        className="mb-3 size-7 rounded-full"
                        style={{
                          backgroundColor: active ? theme.accent : '#e2e8f0',
                        }}
                      />
                      <p className="text-sm font-semibold capitalize text-[#0f172a]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        {index === 0
                          ? t.detail.start
                          : formatCurrency(goal.currency, goal.monthlyTarget)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

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

      <Drawer
        open={showContributionDrawer}
        onOpenChange={setShowContributionDrawer}
      >
        <DrawerContent className="mt-0 h-dvh max-h-dvh rounded-none">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>{t.detail.registerContributionTitle}</DrawerTitle>
            <DrawerDescription>
              {t.detail.registerContributionCopy(goal.title)}
            </DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="grid gap-2">
              {goal.members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setContributionMemberId(member.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left ${
                    contributionMemberId === member.id
                      ? 'border-primary bg-primary/5'
                      : 'border-[#e2e8f0] bg-white'
                  }`}
                >
                  <Avatar name={member.name} image={member.image} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#132238]">
                      {member.name}
                    </p>
                    <p className="truncate text-xs text-[#64748b]">
                      {member.email ?? t.detail.unlinked}
                    </p>
                  </div>
                  {contributionMemberId === member.id ? (
                    <Check className="size-4 text-primary" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#334155]">
                  {t.detail.amount}
                </span>
                <input
                  value={contributionAmount}
                  onChange={(event) =>
                    setContributionAmount(event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0"
                  className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#334155]">
                  {t.detail.date}
                </span>
                <input
                  type="date"
                  value={contributionDate}
                  onChange={(event) => setContributionDate(event.target.value)}
                  className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                {t.detail.optionalNote}
              </span>
              <textarea
                value={contributionNotes}
                onChange={(event) => setContributionNotes(event.target.value)}
                rows={3}
                placeholder={t.detail.contributionNotePlaceholder}
                className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-base outline-none"
              />
            </label>
          </div>

          <DrawerFooter className="shrink-0 border-t border-[#e2e8f0] bg-white">
            <Button
              type="button"
              className="h-12 rounded-full"
              disabled={
                !contributionMemberId ||
                !contributionAmount.trim() ||
                addContributionMutation.isPending
              }
              onClick={() => void saveContribution()}
            >
              {addContributionMutation.isPending
                ? t.detail.savingContribution
                : t.detail.saveContribution}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full"
              onClick={() => setShowContributionDrawer(false)}
            >
              {t.common.cancel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer open={showEditDrawer} onOpenChange={setShowEditDrawer}>
        <DrawerContent className="mt-0 h-dvh max-h-dvh rounded-none">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>{t.detail.editGoalTitle}</DrawerTitle>
            <DrawerDescription>{t.detail.editGoalCopy}</DrawerDescription>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                {t.detail.name}
              </span>
              <input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#334155]">
                {t.detail.description}
              </span>
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={3}
                className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-3 text-base outline-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#334155]">
                  Objetivo
                </span>
                <input
                  value={editTargetAmount}
                  onChange={(event) => setEditTargetAmount(event.target.value)}
                  inputMode="decimal"
                  className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#334155]">
                  Fecha fin
                </span>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(event) => setEditEndDate(event.target.value)}
                  className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-base outline-none"
                />
              </label>
            </div>
            <div className="grid gap-2">
              {contributionModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setEditContributionMode(mode.id)}
                  className={`rounded-2xl border px-4 py-3 text-left ${
                    editContributionMode === mode.id
                      ? 'border-primary bg-primary/5'
                      : 'border-[#e2e8f0] bg-white'
                  }`}
                >
                  <p className="text-sm font-semibold text-[#0f172a]">
                    {mode.label()}
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {mode.description()}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <DrawerFooter className="shrink-0 border-t border-[#e2e8f0] bg-white">
            <Button
              type="button"
              className="h-12 rounded-full"
              disabled={
                !editTitle.trim() ||
                !editTargetAmount.trim() ||
                updateGoalMutation.isPending
              }
              onClick={() => void saveGoalChanges()}
            >
              {updateGoalMutation.isPending
                ? t.common.saving
                : t.common.saveChanges}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full"
              onClick={() => setShowEditDrawer(false)}
            >
              {t.common.cancel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showDeleteContributionDrawer}
        onOpenChange={setShowDeleteContributionDrawer}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.detail.deleteContributionTitle}</DrawerTitle>
            <DrawerDescription>
              {contributionToDelete
                ? `${contributionToDelete.memberName} · ${formatCurrency(
                    contributionToDelete.currency,
                    contributionToDelete.amount,
                  )}`
                : t.detail.deleteContributionConfirm}
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter>
            <Button
              type="button"
              variant="destructive"
              className="h-12 rounded-full"
              disabled={deleteContributionMutation.isPending}
              onClick={() => void confirmDeleteContribution()}
            >
              {deleteContributionMutation.isPending
                ? t.common.deleting
                : t.common.delete}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-full"
              onClick={() => setShowDeleteContributionDrawer(false)}
            >
              {t.common.cancel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-white/10 px-3 py-3 backdrop-blur">
      <p className="text-[11px] text-white/55">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function HeaderAction({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-1 transition-transform active:scale-[0.98]"
    >
      <span
        className={[
          'flex h-9 w-full items-center justify-center rounded-xl text-white transition-colors',
          primary
            ? 'bg-[#ff4d6a] shadow-[0_8px_18px_rgba(255,77,106,0.35)]'
            : 'bg-white/10',
        ].join(' ')}
      >
        {icon}
      </span>
      <span className="max-w-full truncate text-center text-[11px] font-medium text-white/85">
        {label}
      </span>
    </button>
  );
}

function SectionHeader({
  title,
  copy,
  count,
}: {
  title: string;
  copy: string;
  count?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0f172a]">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-[#64748b]">{copy}</p>
      </div>
      {count ? (
        <span className="shrink-0 rounded-full bg-[#f8fafc] px-3 py-1 text-xs text-[#64748b]">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function EmptyCard({
  icon,
  title,
  copy,
}: {
  icon: ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="mt-4 rounded-[24px] border border-dashed border-[#dbe3ef] bg-[#fafafa] px-4 py-7 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-primary">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold text-[#0f172a]">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-[#64748b]">
        {copy}
      </p>
    </div>
  );
}

function InsightCard({
  label,
  value,
  copy,
}: {
  label: string;
  value: string;
  copy: string;
}) {
  return (
    <div className="rounded-[26px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <p className="text-xs text-[#64748b]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-[#0f172a]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[#94a3b8]">{copy}</p>
    </div>
  );
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="size-11 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-sm font-semibold text-[#0f172a]">
      {name.trim().charAt(0).toUpperCase() || 'M'}
    </span>
  );
}

function GoalDetailSkeleton() {
  return (
    <div className="-mx-4 flex flex-1 flex-col gap-4 bg-[#f4f5f7] p-4">
      <div className="h-72 animate-pulse rounded-[34px] bg-[#111111]/90" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-20 animate-pulse rounded-[24px] bg-white" />
        <div className="h-20 animate-pulse rounded-[24px] bg-white" />
        <div className="h-20 animate-pulse rounded-[24px] bg-white" />
      </div>
      <div className="h-52 animate-pulse rounded-[30px] bg-white" />
      <div className="h-64 animate-pulse rounded-[30px] bg-white" />
    </div>
  );
}
