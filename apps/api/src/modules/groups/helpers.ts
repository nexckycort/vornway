import type { Prisma } from '~/generated/prisma/client';

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
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}) {
  let dateWhere: Prisma.ExpenseWhereInput['date'] | undefined;

  if (
    input.range === 'custom' &&
    typeof input.startDate === 'string' &&
    typeof input.endDate === 'string'
  ) {
    dateWhere = {
      gte: getDateStart(input.startDate),
      lte: getDateEnd(input.endDate),
    };
  }

  return {
    ...(input.groupId ? { groupId: input.groupId } : {}),
    ...buildDeletedExpenseWhere(),
    ...(dateWhere ? { date: dateWhere } : {}),
  } as Prisma.ExpenseWhereInput;
}

export function shouldIncludeExpenseInTotals(expense: {
  notes?: string | null;
  participants: Array<unknown>;
}) {
  if (expense.notes?.includes('[DELETED]')) return false;
  if (expense.notes?.includes('[SETTLEMENT:')) return false;
  return expense.participants.length > 0;
}

export function calculateTotalsByCurrency(
  expenses: Array<{
    amount: number;
    currency: string;
    notes?: string | null;
    participants: Array<unknown>;
  }>,
) {
  const totals: Record<string, number> = {};

  for (const expense of expenses) {
    if (!shouldIncludeExpenseInTotals(expense)) continue;
    totals[expense.currency] = normalizeAmount(
      (totals[expense.currency] ?? 0) + expense.amount,
    );
  }

  return totals;
}

export function getDateStart(value: string) {
  return new Date(value);
}

export function getDateEnd(value: string) {
  return new Date(value);
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

export function createPayerShares(input: {
  amount: number;
  payerIds: string[];
  payers?: Array<{ memberId: string; amount: number }>;
}) {
  const uniquePayerIds = Array.from(
    new Set(input.payerIds.map((memberId) => memberId.trim()).filter(Boolean)),
  );

  if (uniquePayerIds.length === 0) {
    return {
      payerIds: [] as string[],
      shares: {} as Record<string, number>,
    };
  }

  if (uniquePayerIds.length === 1) {
    return {
      payerIds: uniquePayerIds,
      shares: {
        [uniquePayerIds[0] as string]: normalizeAmount(input.amount),
      } as Record<string, number>,
    };
  }

  if (input.payers && input.payers.length > 0) {
    const shares = Object.fromEntries(
      input.payers
        .filter((payer) => uniquePayerIds.includes(payer.memberId))
        .map((payer) => [payer.memberId, normalizeAmount(payer.amount)]),
    ) as Record<string, number>;

    return {
      payerIds: uniquePayerIds,
      shares,
    };
  }

  const baseShare = normalizeAmount(input.amount / uniquePayerIds.length);
  const shares: Record<string, number> = {};

  uniquePayerIds.forEach((memberId, index) => {
    if (index === uniquePayerIds.length - 1) {
      const assignedAmount = Object.values(shares).reduce(
        (total, share) => total + share,
        0,
      );
      shares[memberId] = normalizeAmount(input.amount - assignedAmount);
      return;
    }

    shares[memberId] = baseShare;
  });

  return {
    payerIds: uniquePayerIds,
    shares,
  };
}

export function getExpensePayerRows(input: {
  paidById: string;
  amount: number;
  payers?: Array<{ memberId: string; amount: number }>;
}) {
  if (input.payers && input.payers.length > 0) {
    return input.payers.map((payer) => ({
      memberId: payer.memberId,
      amount: normalizeAmount(payer.amount),
    }));
  }

  return [
    {
      memberId: input.paidById,
      amount: normalizeAmount(input.amount),
    },
  ];
}

export function getPrimaryPayerId(input: {
  paidById: string;
  payers?: Array<{ memberId: string; amount: number }>;
}) {
  return input.payers?.[0]?.memberId ?? input.paidById;
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
