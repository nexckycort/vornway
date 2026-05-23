import { Prisma } from '~/generated/prisma/client';

export function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

export function buildGroupAccessWhere(userId: string, groupId?: string) {
  return {
    ...(groupId ? { id: groupId } : {}),
    OR: [
      {
        ownerId: userId,
      },
      {
        GroupMember: {
          some: {
            userId,
          },
        },
      },
    ],
  } as Prisma.GroupWhereInput;
}

export function buildActiveGroupMemberWhere(userId: string, groupId?: string) {
  return {
    ...(groupId ? { groupId } : {}),
    userId,
  } as Prisma.GroupMemberWhereInput;
}

export function buildDeletedExpenseWhere(): Prisma.ExpenseWhereInput {
  return {
    status: 'ACTIVE',
    deletedAt: null,
    OR: [
      { notes: null },
      {
        notes: {
          not: {
            contains: '[DELETED]',
          },
        },
      },
    ],
  } as Prisma.ExpenseWhereInput;
}

export function buildActiveExpenseWhere(
  groupId?: string,
): Prisma.ExpenseWhereInput {
  return {
    ...(groupId ? { groupId } : {}),
    ...buildDeletedExpenseWhere(),
  } as Prisma.ExpenseWhereInput;
}

export function buildReportExpenseWhere(input: {
  groupId?: string;
  range: 'all' | 7 | 15 | 30;
}) {
  return {
    ...(input.groupId ? { groupId: input.groupId } : {}),
    ...buildDeletedExpenseWhere(),
    ...(input.range === 'all'
      ? {}
      : {
          date: {
            gte: getDaysAgoStart(input.range),
          },
        }),
  } as Prisma.ExpenseWhereInput;
}

export function getDaysAgoStart(days: 7 | 15 | 30) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - days);
  return start;
}

export function createSplitShares(input: {
  amount: number;
  participantIds: string[];
  splitMethod: 'equal' | 'percentage' | 'exact';
  exactShares?: Record<string, number>;
}) {
  const { amount, participantIds, splitMethod, exactShares } = input;
  if (participantIds.length === 0) {
    return {
      shares: {} as Record<string, number>,
      normalizedMethod: splitMethod,
    };
  }

  if (splitMethod === 'equal') {
    const share = normalizeAmount(amount / participantIds.length);
    return {
      shares: Object.fromEntries(
        participantIds.map((memberId) => [memberId, share]),
      ),
      normalizedMethod: splitMethod,
    };
  }

  const baseShares = exactShares ?? {};
  const shares =
    splitMethod === 'percentage'
      ? Object.fromEntries(
          participantIds.map((memberId) => [
            memberId,
            normalizeAmount((amount * (baseShares[memberId] ?? 0)) / 100),
          ]),
        )
      : Object.fromEntries(
          participantIds.map((memberId) => [
            memberId,
            normalizeAmount(baseShares[memberId] ?? 0),
          ]),
        );

  return {
    shares,
    normalizedMethod: splitMethod,
  };
}

export function readSplitMethod(
  metadata: unknown,
  participants: Array<{ memberId: string; share: number }>,
): 'equal' | 'percentage' | 'exact' {
  if (
    metadata &&
    typeof metadata === 'object' &&
    'splitMethod' in metadata &&
    typeof (metadata as { splitMethod?: unknown }).splitMethod === 'string'
  ) {
    const splitMethod = (metadata as { splitMethod: string }).splitMethod;
    if (
      splitMethod === 'equal' ||
      splitMethod === 'percentage' ||
      splitMethod === 'exact'
    ) {
      return splitMethod;
    }
  }

  if (participants.length === 0) {
    return 'equal';
  }

  const firstShare = participants[0]?.share ?? 0;
  const allEqual = participants.every(
    (participant) => Math.abs(participant.share - firstShare) < 0.01,
  );

  return allEqual ? 'equal' : 'exact';
}
