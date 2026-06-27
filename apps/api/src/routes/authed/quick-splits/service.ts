import { Effect } from 'effect';
import { Database } from '#/infrastructure/database/context';
import type { WithUserId } from '#/shared/types/app';
import {
  QuickSplitCreateError,
  QuickSplitExpenseCreateError,
  QuickSplitExpenseParticipantsInvalidError,
  QuickSplitExpensePayerInvalidError,
  QuickSplitExpenseSharesInvalidError,
  QuickSplitNotFoundError,
  QuickSplitParticipantsNotFoundError,
  QuickSplitParticipantsRequiredError,
} from './errors';
import { quickSplitsRepository } from './repository';
import type {
  CreateQuickSplitExpenseInput,
  CreateQuickSplitExpenseResult,
  CreateQuickSplitInput,
  CreateQuickSplitResult,
} from './schema';

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

function readSplitMethod(value: string): 'equal' | 'exact' | null {
  if (value === 'equal' || value === 'exact') {
    return value;
  }

  return null;
}

function createEqualShares(input: {
  amount: number;
  participantUserIds: string[];
}): Record<string, number> {
  const { amount, participantUserIds } = input;
  const shares: Record<string, number> = {};
  const count = participantUserIds.length;
  const baseShare = normalizeAmount(amount / count);
  let assigned = 0;

  participantUserIds.forEach((userId, index) => {
    const share =
      index === count - 1 ? normalizeAmount(amount - assigned) : baseShare;
    shares[userId] = share;
    assigned = normalizeAmount(assigned + share);
  });

  return shares;
}

function createExactShares(input: {
  amount: number;
  participantUserIds: string[];
  exactShares?: Record<string, number>;
}): Effect.Effect<Record<string, number>, QuickSplitExpenseSharesInvalidError> {
  const { amount, participantUserIds, exactShares } = input;

  if (!exactShares) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'missing_exact_shares',
      }),
    );
  }

  const unknownUserIds = Object.keys(exactShares).filter(
    (userId) => !participantUserIds.includes(userId),
  );

  if (unknownUserIds.length > 0) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'unknown_participants_in_exact_shares',
      }),
    );
  }

  const shares: Record<string, number> = {};

  for (const participantUserId of participantUserIds) {
    const share = exactShares[participantUserId];

    if (!Number.isFinite(share) || share < 0) {
      return Effect.fail(
        new QuickSplitExpenseSharesInvalidError({
          reason: 'invalid_participant_share',
        }),
      );
    }

    shares[participantUserId] = normalizeAmount(share);
  }

  const totalShares = normalizeAmount(
    Object.values(shares).reduce((sum, share) => sum + share, 0),
  );

  if (totalShares !== normalizeAmount(amount)) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'shares_total_mismatch',
      }),
    );
  }

  return Effect.succeed(shares);
}

export const quickSplitsService = {
  create: ({
    id,
    userId,
    name,
    description,
    participantUserIds,
  }: WithUserId<CreateQuickSplitInput>) =>
    Effect.gen(function* () {
      const db = yield* Database;
      const normalizedParticipantUserIds = Array.from(
        new Set(
          participantUserIds.map((participantUserId) =>
            participantUserId.trim(),
          ),
        ),
      ).filter(
        (participantUserId) =>
          participantUserId.length > 0 && participantUserId !== userId,
      );

      if (normalizedParticipantUserIds.length === 0) {
        return yield* Effect.fail(new QuickSplitParticipantsRequiredError({}));
      }

      const participants = yield* Effect.tryPromise({
        try: () =>
          quickSplitsRepository.findUsersByIds(normalizedParticipantUserIds),
        catch: (cause) => new QuickSplitCreateError({ cause }),
      });

      if (participants.length !== normalizedParticipantUserIds.length) {
        const foundUserIds = new Set(
          participants.map((participant) => participant.id),
        );
        const missingUserIds = normalizedParticipantUserIds.filter(
          (participantUserId) => !foundUserIds.has(participantUserId),
        );

        return yield* Effect.fail(
          new QuickSplitParticipantsNotFoundError({
            missingUserIds,
          }),
        );
      }

      const now = new Date();
      const quickSplitId = id?.trim() || crypto.randomUUID();
      const normalizedName = name.trim();
      const normalizedDescription = description?.trim() || null;

      const result = yield* Effect.tryPromise({
        try: async () => {
          const quickSplit = await quickSplitsRepository.create({
            id: quickSplitId,
            ownerId: userId,
            name: normalizedName,
            description: normalizedDescription,
            participantUserIds: participants.map(
              (participant) => participant.id,
            ),
            createdAt: now,
          });

          return {
            id: quickSplit.id,
            name: quickSplit.name,
            description: quickSplit.description,
            createdAt: quickSplit.createdAt.toISOString(),
          } satisfies CreateQuickSplitResult;
        },
        catch: (cause) => new QuickSplitCreateError({ cause }),
      });

      return result;
    }).pipe(Effect.withSpan('quick_splits.create')),
  createExpense: ({
    id,
    userId,
    quickSplitId,
    description,
    amount,
    currency,
    paidByUserId,
    participantUserIds,
    splitMethod,
    exactShares,
  }: CreateQuickSplitExpenseInput & {
    userId: string;
    quickSplitId: string;
  }) =>
    Effect.gen(function* () {
      const db = yield* Database;
      const quickSplit = yield* Effect.tryPromise({
        try: () =>
          quickSplitsRepository.findAccessibleQuickSplit({
            quickSplitId,
            userId,
          }),
        catch: (cause) => new QuickSplitExpenseCreateError({ cause }),
      });

      if (!quickSplit) {
        return yield* Effect.fail(
          new QuickSplitNotFoundError({ quickSplitId }),
        );
      }

      const quickSplitParticipantUserIds = new Set(
        quickSplit.participants.map((participant) => participant.userId),
      );
      const normalizedParticipantUserIds = Array.from(
        new Set(
          participantUserIds.map((participantUserId) =>
            participantUserId.trim(),
          ),
        ),
      ).filter((participantUserId) => participantUserId.length > 0);

      if (normalizedParticipantUserIds.length === 0) {
        return yield* Effect.fail(
          new QuickSplitExpenseParticipantsInvalidError({
            invalidUserIds: [],
          }),
        );
      }

      const invalidParticipantUserIds = normalizedParticipantUserIds.filter(
        (participantUserId) =>
          !quickSplitParticipantUserIds.has(participantUserId),
      );

      if (invalidParticipantUserIds.length > 0) {
        return yield* Effect.fail(
          new QuickSplitExpenseParticipantsInvalidError({
            invalidUserIds: invalidParticipantUserIds,
          }),
        );
      }

      const normalizedPaidByUserId = paidByUserId?.trim() || userId;

      if (!quickSplitParticipantUserIds.has(normalizedPaidByUserId)) {
        return yield* Effect.fail(
          new QuickSplitExpensePayerInvalidError({
            paidByUserId: normalizedPaidByUserId,
          }),
        );
      }

      const normalizedExpenseId = id?.trim() || undefined;
      const normalizedDescription = description.trim();
      const normalizedAmount = normalizeAmount(amount);
      const normalizedCurrency = currency.trim().toUpperCase();

      if (normalizedExpenseId) {
        const existingExpense = yield* Effect.tryPromise({
          try: () => quickSplitsRepository.findExpenseById(normalizedExpenseId),
          catch: (cause) => new QuickSplitExpenseCreateError({ cause }),
        });

        if (existingExpense) {
          if (existingExpense.quickSplitId !== quickSplitId) {
            return yield* Effect.fail(
              new QuickSplitExpenseSharesInvalidError({
                reason: 'expense_id_already_exists_in_other_quick_split',
              }),
            );
          }

          const existingSplitMethod = readSplitMethod(
            existingExpense.splitMethod,
          );

          if (!existingSplitMethod) {
            return yield* Effect.fail(
              new QuickSplitExpenseCreateError({
                cause: new Error('Invalid quick split expense split method'),
              }),
            );
          }

          return {
            id: existingExpense.id,
            quickSplitId: existingExpense.quickSplitId,
            description: existingExpense.description,
            amount: existingExpense.amount,
            currency: existingExpense.currency,
            paidByUserId: existingExpense.paidByUserId,
            splitMethod: existingSplitMethod,
            participants: existingExpense.participants.map((participant) => ({
              userId: participant.userId,
              share: participant.share,
            })),
            createdAt: existingExpense.createdAt.toISOString(),
          } satisfies CreateQuickSplitExpenseResult;
        }
      }

      const shares =
        splitMethod === 'exact'
          ? yield* createExactShares({
              amount: normalizedAmount,
              participantUserIds: normalizedParticipantUserIds,
              exactShares,
            })
          : createEqualShares({
              amount: normalizedAmount,
              participantUserIds: normalizedParticipantUserIds,
            });

      const now = new Date();
      const expense = yield* Effect.tryPromise({
        try: () =>
          db.$transaction(async (tx) => {
            const createdExpense = await quickSplitsRepository.createExpense(
              tx,
              {
                id: normalizedExpenseId,
                quickSplitId,
                paidByUserId: normalizedPaidByUserId,
                description: normalizedDescription,
                amount: normalizedAmount,
                currency: normalizedCurrency,
                splitMethod,
                shares,
                createdAt: now,
              },
            );

            await tx.quickSplit.update({
              where: { id: quickSplitId },
              data: {
                updatedAt: now,
              },
            });

            return createdExpense;
          }),
        catch: (cause) => new QuickSplitExpenseCreateError({ cause }),
      });

      const createdSplitMethod = readSplitMethod(expense.splitMethod);

      if (!createdSplitMethod) {
        return yield* Effect.fail(
          new QuickSplitExpenseCreateError({
            cause: new Error('Invalid quick split expense split method'),
          }),
        );
      }

      return {
        id: expense.id,
        quickSplitId: expense.quickSplitId,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        paidByUserId: expense.paidByUserId,
        splitMethod: createdSplitMethod,
        participants: expense.participants.map((participant) => ({
          userId: participant.userId,
          share: participant.share,
        })),
        createdAt: expense.createdAt.toISOString(),
      } satisfies CreateQuickSplitExpenseResult;
    }).pipe(Effect.withSpan('quick_splits.create_expense')),
};
