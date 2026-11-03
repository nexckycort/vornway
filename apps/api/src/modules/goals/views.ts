import { DateTime } from 'effect';
import { resolveUserImageUrl } from '#/infrastructure/storage/image-urls';
import type { GoalDetailRow, GoalListRow } from './queries';

export const summarizeGoal = (goal: GoalListRow, now: Date) => {
  const savedAmount = totalOf(goal.contributions);
  const participantCount = goal.group._count.GroupMember;
  const monthlyTarget = monthlyTargetOf(goal);
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    goalType: goal.goalType,
    emoji: goal.emoji,
    coverImageUrl: goal.coverImageUrl,
    themeColor: goal.themeColor,
    contributionMode: goal.contributionMode,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress: progressOf(savedAmount, goal.targetAmount),
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    participantCount,
    daysLeft: Math.max(0, differenceInCalendarDays(now, goal.endDate)),
    monthlyTarget,
    perMemberMonthlyTarget: normalizeAmount(
      monthlyTarget / Math.max(1, participantCount),
    ),
    group: { id: goal.group.id, name: goal.group.name },
  };
};

export const summarizeGoalDetail = (
  goal: GoalDetailRow,
  userId: string,
  now: Date,
) => {
  const currentMonthKey = monthKey(now);
  const savedAmount = totalOf(goal.contributions);
  const members = goal.group.GroupMember;
  const currentMembership = members.find((member) => member.userId === userId);
  const currentMonthContributions = goal.contributions.filter(
    (contribution) => monthKey(contribution.contributedAt) === currentMonthKey,
  );
  const memberStats = members.map((member) => {
    const memberContributions = goal.contributions.filter(
      (contribution) => contribution.member.id === member.id,
    );
    return {
      memberId: member.id,
      totalAmount: totalOf(memberContributions),
      contributionCount: memberContributions.length,
      contributedThisMonth: memberContributions.some(
        (contribution) =>
          monthKey(contribution.contributedAt) === currentMonthKey,
      ),
      latestContributionAt:
        [...memberContributions].sort(
          (left, right) =>
            right.contributedAt.getTime() - left.contributedAt.getTime(),
        )[0]?.contributedAt ?? null,
    };
  });
  const monthlyTarget = monthlyTargetOf(goal);
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    goalType: goal.goalType,
    emoji: goal.emoji,
    coverImageUrl: goal.coverImageUrl,
    themeColor: goal.themeColor,
    contributionMode: goal.contributionMode,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress: progressOf(savedAmount, goal.targetAmount),
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    participantCount: members.length,
    daysLeft: Math.max(0, differenceInCalendarDays(now, goal.endDate)),
    monthlyTarget,
    perMemberMonthlyTarget: normalizeAmount(
      monthlyTarget / Math.max(1, members.length),
    ),
    startDate: goal.startDate,
    installmentCount: goal.installmentCount,
    installmentAmount: goal.installmentAmount,
    suggestedContributionAmount: goal.suggestedContributionAmount,
    completedAt: goal.completedAt,
    updatedAt: goal.updatedAt,
    group: {
      id: goal.group.id,
      name: goal.group.name,
      type: goal.group.type,
      description: goal.group.description,
      inviteCode: goal.group.inviteCode,
      createdAt: goal.group.createdAt,
      updatedAt: goal.group.updatedAt,
    },
    members: members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.user?.email ?? null,
      image: resolveUserImageUrl(
        member.user?.image ?? null,
        member.user?.updatedAt ?? null,
      ),
      role: member.role,
      userId: member.userId,
      isCurrentUser: member.userId === userId,
    })),
    myMembership: currentMembership
      ? {
          id: currentMembership.id,
          name: currentMembership.name,
          role: currentMembership.role,
        }
      : null,
    contributions: goal.contributions.map((contribution) => ({
      id: contribution.id,
      amount: contribution.amount,
      contributedAt: contribution.contributedAt,
      notes: contribution.notes,
      member: {
        id: contribution.member.id,
        name: contribution.member.name,
        image: resolveUserImageUrl(
          contribution.member.user?.image ?? null,
          contribution.member.user?.updatedAt ?? null,
        ),
        isCurrentUser: contribution.member.userId === userId,
      },
    })),
    stats: {
      remainingAmount: normalizeAmount(
        Math.max(0, goal.targetAmount - savedAmount),
      ),
      averageContribution:
        goal.contributions.length > 0
          ? normalizeAmount(savedAmount / goal.contributions.length)
          : 0,
      projectedCompletionDate: projectedCompletionDate(
        savedAmount,
        goal.targetAmount,
        goal.contributions,
        now,
      ),
      currentMonthContributionTotal: totalOf(currentMonthContributions),
      contributorsThisMonth: new Set(
        currentMonthContributions.map((contribution) => contribution.member.id),
      ).size,
      pendingMembersThisMonth: memberStats.filter(
        (member) => !member.contributedThisMonth,
      ).length,
    },
    memberStats,
  };
};

const normalizeAmount = (value: number) => Number(value.toFixed(2));

const totalOf = (contributions: readonly { amount: number }[]) =>
  normalizeAmount(
    contributions.reduce(
      (total, contribution) => total + contribution.amount,
      0,
    ),
  );

const progressOf = (savedAmount: number, targetAmount: number) =>
  targetAmount > 0
    ? Math.min(100, normalizeAmount((savedAmount / targetAmount) * 100))
    : 0;

const monthlyTargetOf = (goal: {
  installmentAmount: number;
  targetAmount: number;
  installmentCount: number;
}) =>
  normalizeAmount(
    goal.installmentAmount ||
      goal.targetAmount / Math.max(1, goal.installmentCount),
  );

const differenceInCalendarDays = (from: Date, to: Date) => {
  const fromDate = cloneDate(from);
  const toDate = cloneDate(to);
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);
  return Math.ceil((toDate.getTime() - fromDate.getTime()) / 86_400_000);
};

const cloneDate = (value: Date) =>
  DateTime.toDateUtc(DateTime.makeUnsafe(value));

const monthKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const projectedCompletionDate = (
  savedAmount: number,
  targetAmount: number,
  contributions: readonly { amount: number; contributedAt: Date }[],
  now: Date,
) => {
  const remaining = targetAmount - savedAmount;
  if (remaining <= 0) return cloneDate(now);
  const sorted = [...contributions].sort(
    (left, right) =>
      left.contributedAt.getTime() - right.contributedAt.getTime(),
  );
  const first = sorted[0]?.contributedAt;
  const last = sorted.at(-1)?.contributedAt;
  if (!first || !last) return null;

  const days = Math.max(1, differenceInCalendarDays(first, last) + 1);
  const ratePerDay =
    sorted.reduce((total, contribution) => total + contribution.amount, 0) /
    days;
  if (ratePerDay <= 0) return null;

  const projected = cloneDate(now);
  projected.setDate(projected.getDate() + Math.ceil(remaining / ratePerDay));
  return projected;
};
