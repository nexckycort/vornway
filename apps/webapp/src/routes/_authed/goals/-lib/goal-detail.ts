import type { GoalDetailData } from '../-hooks/use-goal-detail-query';

const goalDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const goalMonthFormatter = new Intl.DateTimeFormat('es-CO', {
  month: 'short',
});

export function formatDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return goalDateFormatter.format(date);
}

export function toDateInputValue(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function monthLabel(value: Date) {
  return goalMonthFormatter.format(value);
}

export const currentMonthDate = new Date();

export function buildTimeline(
  startDate: string | Date,
  endDate: string | Date,
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const months: { key: string; label: string; date: Date }[] = [];

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

export function rankMembers(goal: GoalDetailData) {
  return goal.members
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
}
