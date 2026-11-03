import { DateTime, Effect, Option, Schema } from 'effect';
import type { Prisma } from '#/generated/prisma/client';

export const parseDate = (value: string) =>
  DateTime.toDateUtc(DateTime.makeUnsafe(value));

export const normalizeAmount = (value: number) => Number(value.toFixed(2));

export const required =
  <E>(onMissing: () => E) =>
  <A, E2>(self: Effect.Effect<A | null, E2>): Effect.Effect<A, E | E2> =>
    Effect.flatMap(self, (value) =>
      value === null ? Effect.fail(onMissing()) : Effect.succeed(value),
    );

export const accessibleGroup = (
  userId: string,
  groupId?: string,
): Prisma.GroupWhereInput => ({
  ...(groupId ? { id: groupId } : {}),
  OR: [{ ownerId: userId }, { GroupMember: { some: { userId } } }],
});

export const visibleGroup = (
  userId: string,
  groupId?: string,
): Prisma.GroupWhereInput => ({
  ...accessibleGroup(userId, groupId),
  type: { not: 'meta' },
});

export const membershipOf = (
  userId: string,
  groupId: string,
): Prisma.GroupMemberWhereInput => ({ groupId, userId });

export const activeExpenses = (groupId?: string): Prisma.ExpenseWhereInput => ({
  ...(groupId ? { groupId } : {}),
  status: 'ACTIVE',
  deletedAt: null,
  OR: [{ notes: null }, { notes: { not: { contains: '[DELETED]' } } }],
});

export const reportExpenses = (input: {
  groupId: string;
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}): Prisma.ExpenseWhereInput => ({
  ...activeExpenses(input.groupId),
  ...(input.range === 'custom' && input.startDate && input.endDate
    ? {
        date: {
          gte: parseDate(input.startDate),
          lte: parseDate(input.endDate),
        },
      }
    : {}),
});

export const calculateTotalsByCurrency = (
  expenses: readonly {
    amount: number;
    currency: string;
    notes?: string | null;
    participants: readonly unknown[];
  }[],
  options?: { includeParticipantlessExpenses?: boolean },
) =>
  expenses
    .filter(
      (expense) =>
        !expense.notes?.includes('[DELETED]') &&
        !expense.notes?.includes('[SETTLEMENT:') &&
        (options?.includeParticipantlessExpenses === true ||
          expense.participants.length > 0),
    )
    .reduce<Record<string, number>>((totals, expense) => {
      totals[expense.currency] = normalizeAmount(
        (totals[expense.currency] ?? 0) + expense.amount,
      );
      return totals;
    }, {});

export const createSplitShares = (input: {
  amount: number;
  participantIds: readonly string[];
  splitMethod: 'equal' | 'percentage' | 'exact';
  exactShares?: Readonly<Record<string, number>>;
}): { shares: Record<string, number> } => {
  if (input.participantIds.length === 0) return { shares: {} };
  const base = input.exactShares ?? {};
  const share = (memberId: string) => {
    if (input.splitMethod === 'equal') {
      return normalizeAmount(input.amount / input.participantIds.length);
    }
    if (input.splitMethod === 'percentage') {
      return normalizeAmount((input.amount * (base[memberId] ?? 0)) / 100);
    }
    return normalizeAmount(base[memberId] ?? 0);
  };
  return {
    shares: Object.fromEntries(
      input.participantIds.map((memberId) => [memberId, share(memberId)]),
    ),
  };
};

export const createPayerShares = (input: {
  amount: number;
  payerIds: readonly string[];
  payers?: readonly { memberId: string; amount: number }[];
}): { payerIds: string[]; shares: Record<string, number> } => {
  const payerIds = Array.from(
    new Set(input.payerIds.map((memberId) => memberId.trim()).filter(Boolean)),
  );
  const [onlyPayer] = payerIds;
  if (onlyPayer === undefined) return { payerIds, shares: {} };
  if (payerIds.length === 1) {
    return {
      payerIds,
      shares: { [onlyPayer]: normalizeAmount(input.amount) },
    };
  }
  if (input.payers && input.payers.length > 0) {
    return {
      payerIds,
      shares: Object.fromEntries(
        input.payers
          .filter((payer) => payerIds.includes(payer.memberId))
          .map((payer) => [payer.memberId, normalizeAmount(payer.amount)]),
      ),
    };
  }

  const baseShare = normalizeAmount(input.amount / payerIds.length);
  const lastId = payerIds[payerIds.length - 1];
  const assigned = baseShare * (payerIds.length - 1);
  return {
    payerIds,
    shares: Object.fromEntries(
      payerIds.map((memberId) => [
        memberId,
        memberId === lastId
          ? normalizeAmount(input.amount - assigned)
          : baseShare,
      ]),
    ),
  };
};

export const readSplitMethod = (
  metadata: unknown,
  participants: readonly { share: number }[],
): 'equal' | 'percentage' | 'exact' => {
  const stored =
    metadata && typeof metadata === 'object' && 'splitMethod' in metadata
      ? metadata.splitMethod
      : undefined;
  if (stored === 'equal' || stored === 'percentage' || stored === 'exact') {
    return stored;
  }
  const first = participants[0]?.share ?? 0;
  return participants.every(
    (participant) => Math.abs(participant.share - first) < 0.01,
  )
    ? 'equal'
    : 'exact';
};

export const isSettlement = (notes: string | null) =>
  Boolean(notes?.includes('[SETTLEMENT:'));

export const readTotals = (totals: unknown): Record<string, number> =>
  Option.getOrElse(
    Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Number))(
      totals,
    ),
    () => ({}),
  );
