import { Effect } from 'effect';
import { Database } from '#/infrastructure/database/context';
import { resolveUserImageUrl } from '#/routes/authed/users/user-image.service';
import type { WithUserId } from '#/shared/types/app';
import {
  QuickSplitCreateError,
  QuickSplitExpenseCreateError,
  QuickSplitExpenseDeleteError,
  QuickSplitExpenseDetailError,
  QuickSplitExpenseNotFoundError,
  QuickSplitExpenseParticipantsInvalidError,
  QuickSplitExpensePayerInvalidError,
  QuickSplitExpenseSharesInvalidError,
  QuickSplitExpensesListError,
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
  DeleteQuickSplitExpenseResult,
  ListQuickSplitExpensesQueryInput,
  ListQuickSplitExpensesResult,
  ListRecentQuickSplitExpensesQueryInput,
  ListRecentQuickSplitExpensesResult,
  QuickSplitExpenseDetailResult,
  QuickSplitExpenseFeedItem,
} from './schema';

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

function readSplitMethod(
  value: string,
): 'equal' | 'percentage' | 'exact' | null {
  if (value === 'equal' || value === 'percentage' || value === 'exact') {
    return value;
  }

  return null;
}

function createEqualShares(input: {
  amount: number;
  participantIds: string[];
}): Record<string, number> {
  const { amount, participantIds } = input;
  const shares: Record<string, number> = {};
  const count = participantIds.length;
  const baseShare = normalizeAmount(amount / count);
  let assigned = 0;

  participantIds.forEach((participantId, index) => {
    const share =
      index === count - 1 ? normalizeAmount(amount - assigned) : baseShare;
    shares[participantId] = share;
    assigned = normalizeAmount(assigned + share);
  });

  return shares;
}

function createExactShares(input: {
  amount: number;
  participantIds: string[];
  exactShares?: Record<string, number>;
}): Effect.Effect<Record<string, number>, QuickSplitExpenseSharesInvalidError> {
  const { amount, participantIds, exactShares } = input;

  if (!exactShares) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'missing_exact_shares',
      }),
    );
  }

  const unknownParticipantIds = Object.keys(exactShares).filter(
    (participantId) => !participantIds.includes(participantId),
  );

  if (unknownParticipantIds.length > 0) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'unknown_participants_in_exact_shares',
      }),
    );
  }

  const shares: Record<string, number> = {};

  for (const participantId of participantIds) {
    const share = exactShares[participantId];

    if (!Number.isFinite(share) || share < 0) {
      return Effect.fail(
        new QuickSplitExpenseSharesInvalidError({
          reason: 'invalid_participant_share',
        }),
      );
    }

    shares[participantId] = normalizeAmount(share);
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

function createPercentageShares(input: {
  amount: number;
  participantIds: string[];
  percentageShares?: Record<string, number>;
}): Effect.Effect<Record<string, number>, QuickSplitExpenseSharesInvalidError> {
  const { amount, participantIds, percentageShares } = input;

  if (!percentageShares) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'missing_percentage_shares',
      }),
    );
  }

  const unknownParticipantIds = Object.keys(percentageShares).filter(
    (participantId) => !participantIds.includes(participantId),
  );

  if (unknownParticipantIds.length > 0) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'unknown_participants_in_percentage_shares',
      }),
    );
  }

  const percentages: Record<string, number> = {};

  for (const participantId of participantIds) {
    const percentage = percentageShares[participantId];

    if (!Number.isFinite(percentage) || percentage <= 0) {
      return Effect.fail(
        new QuickSplitExpenseSharesInvalidError({
          reason: 'invalid_participant_percentage',
        }),
      );
    }

    percentages[participantId] = normalizeAmount(percentage);
  }

  const totalPercentage = normalizeAmount(
    Object.values(percentages).reduce((sum, value) => sum + value, 0),
  );

  if (Math.abs(totalPercentage - 100) >= 0.01) {
    return Effect.fail(
      new QuickSplitExpenseSharesInvalidError({
        reason: 'percentage_total_mismatch',
      }),
    );
  }

  const shares: Record<string, number> = {};
  let assigned = 0;

  participantIds.forEach((participantId, index) => {
    const share =
      index === participantIds.length - 1
        ? normalizeAmount(amount - assigned)
        : normalizeAmount(amount * (percentages[participantId]! / 100));

    shares[participantId] = share;
    assigned = normalizeAmount(assigned + share);
  });

  return Effect.succeed(shares);
}

function mapQuickSplitExpenseFeedItem(input: {
  id: string;
  quickSplitId: string;
  description: string;
  amount: number;
  currency: string;
  createdAt: Date;
  paidByParticipant: {
    id: string;
    userId: string | null;
    name: string;
  };
  quickSplit: {
    name: string;
    _count: {
      participants: number;
    };
  };
}): QuickSplitExpenseFeedItem {
  return {
    id: input.id,
    quickSplitId: input.quickSplitId,
    quickSplitName: input.quickSplit.name,
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    participantCount: input.quickSplit._count.participants,
    paidBy: {
      id: input.paidByParticipant.id,
      userId: input.paidByParticipant.userId,
      name: input.paidByParticipant.name,
    },
    createdAt: input.createdAt.toISOString(),
  };
}

function toCreateExpenseResult(input: {
  id: string;
  quickSplitId: string;
  description: string;
  amount: number;
  currency: string;
  paidByParticipantId: string;
  splitMethod: string;
  createdAt: Date;
  participants: Array<{
    participantId: string;
    share: number;
  }>;
}): Effect.Effect<CreateQuickSplitExpenseResult, QuickSplitExpenseCreateError> {
  const splitMethod = readSplitMethod(input.splitMethod);

  if (!splitMethod) {
    return Effect.fail(
      new QuickSplitExpenseCreateError({
        cause: new Error('Invalid quick split expense split method'),
      }),
    );
  }

  return Effect.succeed({
    id: input.id,
    quickSplitId: input.quickSplitId,
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    paidByParticipantId: input.paidByParticipantId,
    splitMethod,
    participants: input.participants.map((participant) => ({
      participantId: participant.participantId,
      share: participant.share,
    })),
    createdAt: input.createdAt.toISOString(),
  });
}

function normalizeParticipantIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()))).filter(
    (id) => id.length > 0,
  );
}

export const quickSplitsService = {
  deleteExpense: Effect.fn('quick_splits.delete_expense')(function* ({
    quickSplitId,
    expenseId,
    userId,
  }: {
    quickSplitId: string;
    expenseId: string;
    userId: string;
  }) {
    const db = yield* Database;

    const expense = yield* Effect.tryPromise({
      try: () =>
        quickSplitsRepository.findAccessibleExpense({
          quickSplitId,
          expenseId,
          userId,
        }),
      catch: (cause) => new QuickSplitExpenseDeleteError({ cause }),
    });

    if (!expense) {
      return yield* Effect.fail(
        new QuickSplitExpenseNotFoundError({ expenseId }),
      );
    }

    const deletedExpense = yield* Effect.tryPromise({
      try: () =>
        db.$transaction(async (tx) => {
          const deleted = await quickSplitsRepository.deleteExpense(
            tx,
            expense.id,
          );

          await tx.quickSplit.update({
            where: { id: deleted.quickSplitId },
            data: {
              updatedAt: new Date(),
            },
          });

          return deleted;
        }),
      catch: (cause) => new QuickSplitExpenseDeleteError({ cause }),
    });

    return {
      id: deletedExpense.id,
    } satisfies DeleteQuickSplitExpenseResult;
  }),
  getExpenseDetail: Effect.fn('quick_splits.get_expense_detail')(function* ({
    quickSplitId,
    expenseId,
    userId,
  }: {
    quickSplitId: string;
    expenseId: string;
    userId: string;
  }) {
    yield* Database;

    const expense = yield* Effect.tryPromise({
      try: () =>
        quickSplitsRepository.findAccessibleExpenseDetail({
          quickSplitId,
          expenseId,
          userId,
        }),
      catch: (cause) => new QuickSplitExpenseDetailError({ cause }),
    });

    if (!expense) {
      return yield* Effect.fail(
        new QuickSplitExpenseNotFoundError({ expenseId }),
      );
    }

    const participantMeta = new Map(
      expense.quickSplit.participants.map((participant) => [
        participant.id,
        participant,
      ]),
    );
    const splitMethod = readSplitMethod(expense.splitMethod);

    if (!splitMethod) {
      return yield* Effect.fail(
        new QuickSplitExpenseDetailError({
          cause: new Error('Invalid quick split expense split method'),
        }),
      );
    }

    return {
      id: expense.id,
      quickSplitId: expense.quickSplitId,
      quickSplitName: expense.quickSplit.name,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      splitMethod,
      createdAt: expense.createdAt.toISOString(),
      paidBy: {
        id: expense.paidByParticipant.id,
        userId: expense.paidByParticipant.userId,
        name: expense.paidByParticipant.name,
        image: resolveUserImageUrl(
          expense.paidByParticipant.user?.image,
          expense.paidByParticipant.user?.updatedAt ?? null,
        ),
      },
      participants: expense.participants.map((participant) => {
        const meta = participantMeta.get(participant.participantId);

        return {
          id: participant.participantId,
          userId: meta?.userId ?? null,
          name: meta?.name ?? 'Participante',
          image: resolveUserImageUrl(
            meta?.user?.image,
            meta?.user?.updatedAt ?? null,
          ),
          share: participant.share,
          role: meta?.role ?? 'participant',
        };
      }),
    } satisfies QuickSplitExpenseDetailResult;
  }),
  listRecentExpenses: Effect.fn('quick_splits.list_recent_expenses')(
    function* ({
      userId,
      limit,
    }: ListRecentQuickSplitExpensesQueryInput & {
      userId: string;
    }) {
      yield* Database;

      const rows = yield* Effect.tryPromise({
        try: () =>
          quickSplitsRepository.listAccessibleExpenses({
            userId,
            limit,
          }),
        catch: (cause) => new QuickSplitExpensesListError({ cause }),
      });

      return {
        data: rows.slice(0, limit).map(mapQuickSplitExpenseFeedItem),
      } satisfies ListRecentQuickSplitExpensesResult;
    },
  ),
  listExpenses: Effect.fn('quick_splits.list_expenses')(function* ({
    userId,
    limit,
    cursor,
  }: ListQuickSplitExpensesQueryInput & {
    userId: string;
  }) {
    yield* Database;

    const [total, rows] = yield* Effect.tryPromise({
      try: () =>
        Promise.all([
          quickSplitsRepository.countAccessibleExpenses(userId),
          quickSplitsRepository.listAccessibleExpenses({
            userId,
            limit,
            cursor,
          }),
        ]),
      catch: (cause) => new QuickSplitExpensesListError({ cause }),
    });

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;

    return {
      data: data.map(mapQuickSplitExpenseFeedItem),
      pagination: {
        limit,
        total,
        nextCursor: hasNextPage ? (data.at(-1)?.id ?? null) : null,
      },
    } satisfies ListQuickSplitExpensesResult;
  }),
  create: ({
    id,
    userId,
    name,
    description,
    participants,
  }: WithUserId<CreateQuickSplitInput>) =>
    Effect.gen(function* () {
      const db = yield* Database;
      const normalizedParticipants = participants
        .map((participant) => ({
          clientId: participant.clientId?.trim() || undefined,
          name: participant.name.trim(),
          userId: participant.userId?.trim() || undefined,
        }))
        .filter(
          (participant) =>
            participant.name.length > 0 && participant.userId !== userId,
        );

      if (normalizedParticipants.length === 0) {
        return yield* Effect.fail(new QuickSplitParticipantsRequiredError({}));
      }

      const registeredUserIds = Array.from(
        new Set(
          normalizedParticipants.flatMap((participant) =>
            participant.userId ? [participant.userId] : [],
          ),
        ),
      );

      const registeredUsers = yield* Effect.tryPromise({
        try: () => quickSplitsRepository.findUsersByIds(registeredUserIds),
        catch: (cause) => new QuickSplitCreateError({ cause }),
      });

      if (registeredUsers.length !== registeredUserIds.length) {
        const foundUserIds = new Set(
          registeredUsers.map((participant) => participant.id),
        );
        const missingUserIds = registeredUserIds.filter(
          (participantUserId) => !foundUserIds.has(participantUserId),
        );

        return yield* Effect.fail(
          new QuickSplitParticipantsNotFoundError({
            missingUserIds,
          }),
        );
      }

      const currentUser = yield* Effect.tryPromise({
        try: () =>
          db.user.findUnique({
            where: { id: userId },
            select: { name: true },
          }),
        catch: (cause) => new QuickSplitCreateError({ cause }),
      });

      if (!currentUser) {
        return yield* Effect.fail(
          new QuickSplitCreateError({
            cause: new Error('Quick split owner not found'),
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
            ownerName: currentUser.name,
            name: normalizedName,
            description: normalizedDescription,
            participants: normalizedParticipants,
            createdAt: now,
          });

          return {
            id: quickSplit.id,
            name: quickSplit.name,
            description: quickSplit.description,
            participants: quickSplit.participants.map((participant, index) => ({
              id: participant.id,
              ...(index > 0 && normalizedParticipants[index - 1]?.clientId
                ? { clientId: normalizedParticipants[index - 1]!.clientId }
                : {}),
              userId: participant.userId,
              name: participant.name,
              role: participant.role,
            })),
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
    paidByParticipantId,
    participantIds,
    splitMethod,
    percentageShares,
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

      const quickSplitParticipantIds = new Set(
        quickSplit.participants.map((participant) => participant.id),
      );
      const normalizedParticipantIds = normalizeParticipantIds(participantIds);

      if (normalizedParticipantIds.length === 0) {
        return yield* Effect.fail(
          new QuickSplitExpenseParticipantsInvalidError({
            invalidUserIds: [],
          }),
        );
      }

      const invalidParticipantIds = normalizedParticipantIds.filter(
        (participantId) => !quickSplitParticipantIds.has(participantId),
      );

      if (invalidParticipantIds.length > 0) {
        return yield* Effect.fail(
          new QuickSplitExpenseParticipantsInvalidError({
            invalidUserIds: invalidParticipantIds,
          }),
        );
      }

      const ownerParticipantId =
        quickSplit.participants.find(
          (participant) => participant.userId === userId,
        )?.id ?? null;
      const normalizedPaidByParticipantId =
        paidByParticipantId?.trim() || ownerParticipantId;

      if (
        !normalizedPaidByParticipantId ||
        !quickSplitParticipantIds.has(normalizedPaidByParticipantId)
      ) {
        return yield* Effect.fail(
          new QuickSplitExpensePayerInvalidError({
            paidByUserId: normalizedPaidByParticipantId ?? userId,
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

          return yield* toCreateExpenseResult(existingExpense);
        }
      }

      const shares =
        splitMethod === 'exact'
          ? yield* createExactShares({
              amount: normalizedAmount,
              participantIds: normalizedParticipantIds,
              exactShares,
            })
          : splitMethod === 'percentage'
            ? yield* createPercentageShares({
                amount: normalizedAmount,
                participantIds: normalizedParticipantIds,
                percentageShares,
              })
            : createEqualShares({
                amount: normalizedAmount,
                participantIds: normalizedParticipantIds,
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
                paidByParticipantId: normalizedPaidByParticipantId,
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

      return yield* toCreateExpenseResult(expense);
    }).pipe(Effect.withSpan('quick_splits.create_expense')),
  updateExpense: ({
    userId,
    quickSplitId,
    expenseId,
    description,
    amount,
    currency,
    paidByParticipantId,
    participantIds,
    splitMethod,
    percentageShares,
    exactShares,
  }: CreateQuickSplitExpenseInput & {
    userId: string;
    quickSplitId: string;
    expenseId: string;
  }) =>
    Effect.gen(function* () {
      const db = yield* Database;
      const existingExpense = yield* Effect.tryPromise({
        try: () =>
          quickSplitsRepository.findAccessibleExpense({
            quickSplitId,
            expenseId,
            userId,
          }),
        catch: (cause) => new QuickSplitExpenseCreateError({ cause }),
      });

      if (!existingExpense) {
        return yield* Effect.fail(
          new QuickSplitExpenseNotFoundError({ expenseId }),
        );
      }

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

      const quickSplitParticipantIds = new Set(
        quickSplit.participants.map((participant) => participant.id),
      );
      const normalizedParticipantIds = normalizeParticipantIds(participantIds);

      if (normalizedParticipantIds.length === 0) {
        return yield* Effect.fail(
          new QuickSplitExpenseParticipantsInvalidError({
            invalidUserIds: [],
          }),
        );
      }

      const invalidParticipantIds = normalizedParticipantIds.filter(
        (participantId) => !quickSplitParticipantIds.has(participantId),
      );

      if (invalidParticipantIds.length > 0) {
        return yield* Effect.fail(
          new QuickSplitExpenseParticipantsInvalidError({
            invalidUserIds: invalidParticipantIds,
          }),
        );
      }

      const ownerParticipantId =
        quickSplit.participants.find(
          (participant) => participant.userId === userId,
        )?.id ?? null;
      const normalizedPaidByParticipantId =
        paidByParticipantId?.trim() || ownerParticipantId;

      if (
        !normalizedPaidByParticipantId ||
        !quickSplitParticipantIds.has(normalizedPaidByParticipantId)
      ) {
        return yield* Effect.fail(
          new QuickSplitExpensePayerInvalidError({
            paidByUserId: normalizedPaidByParticipantId ?? userId,
          }),
        );
      }

      const normalizedDescription = description.trim();
      const normalizedAmount = normalizeAmount(amount);
      const normalizedCurrency = currency.trim().toUpperCase();

      const shares =
        splitMethod === 'exact'
          ? yield* createExactShares({
              amount: normalizedAmount,
              participantIds: normalizedParticipantIds,
              exactShares,
            })
          : splitMethod === 'percentage'
            ? yield* createPercentageShares({
                amount: normalizedAmount,
                participantIds: normalizedParticipantIds,
                percentageShares,
              })
            : createEqualShares({
                amount: normalizedAmount,
                participantIds: normalizedParticipantIds,
              });

      const now = new Date();
      const expense = yield* Effect.tryPromise({
        try: () =>
          db.$transaction(async (tx) => {
            const updatedExpense = await quickSplitsRepository.updateExpense(
              tx,
              {
                expenseId,
                paidByParticipantId: normalizedPaidByParticipantId,
                description: normalizedDescription,
                amount: normalizedAmount,
                currency: normalizedCurrency,
                splitMethod,
                shares,
                updatedAt: now,
              },
            );

            await tx.quickSplit.update({
              where: { id: quickSplitId },
              data: {
                updatedAt: now,
              },
            });

            return updatedExpense;
          }),
        catch: (cause) => new QuickSplitExpenseCreateError({ cause }),
      });

      return yield* toCreateExpenseResult(expense);
    }).pipe(Effect.withSpan('quick_splits.update_expense')),
};
