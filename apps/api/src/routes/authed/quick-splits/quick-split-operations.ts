import { db } from '#/infrastructure/database/connection';
import { resolveUserImageUrl } from '#/infrastructure/storage/user-images';
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
import { quickSplitsPersistence } from './quick-splits.persistence';
import type {
  CreateQuickSplitExpenseInput,
  CreateQuickSplitExpenseResult,
  CreateQuickSplitInput,
  CreateQuickSplitResult,
  DeleteQuickSplitExpenseResult,
  ListQuickSplitExpensesQueryInput,
  ListQuickSplitExpensesResult,
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
}): Record<string, number> {
  const { amount, participantIds, exactShares } = input;

  if (!exactShares) {
    throw new QuickSplitExpenseSharesInvalidError({
      reason: 'missing_exact_shares',
    });
  }

  const unknownParticipantIds = Object.keys(exactShares).filter(
    (participantId) => !participantIds.includes(participantId),
  );

  if (unknownParticipantIds.length > 0) {
    throw new QuickSplitExpenseSharesInvalidError({
      reason: 'unknown_participants_in_exact_shares',
    });
  }

  const shares: Record<string, number> = {};

  for (const participantId of participantIds) {
    const share = exactShares[participantId];

    if (!Number.isFinite(share) || share < 0) {
      throw new QuickSplitExpenseSharesInvalidError({
        reason: 'invalid_participant_share',
      });
    }

    shares[participantId] = normalizeAmount(share);
  }

  const totalShares = normalizeAmount(
    Object.values(shares).reduce((sum, share) => sum + share, 0),
  );

  if (totalShares !== normalizeAmount(amount)) {
    throw new QuickSplitExpenseSharesInvalidError({
      reason: 'shares_total_mismatch',
    });
  }

  return shares;
}

function createPercentageShares(input: {
  amount: number;
  participantIds: string[];
  percentageShares?: Record<string, number>;
}): Record<string, number> {
  const { amount, participantIds, percentageShares } = input;

  if (!percentageShares) {
    throw new QuickSplitExpenseSharesInvalidError({
      reason: 'missing_percentage_shares',
    });
  }

  const unknownParticipantIds = Object.keys(percentageShares).filter(
    (participantId) => !participantIds.includes(participantId),
  );

  if (unknownParticipantIds.length > 0) {
    throw new QuickSplitExpenseSharesInvalidError({
      reason: 'unknown_participants_in_percentage_shares',
    });
  }

  const percentages: Record<string, number> = {};

  for (const participantId of participantIds) {
    const percentage = percentageShares[participantId];

    if (!Number.isFinite(percentage) || percentage <= 0) {
      throw new QuickSplitExpenseSharesInvalidError({
        reason: 'invalid_participant_percentage',
      });
    }

    percentages[participantId] = normalizeAmount(percentage);
  }

  const totalPercentage = normalizeAmount(
    Object.values(percentages).reduce((sum, value) => sum + value, 0),
  );

  if (Math.abs(totalPercentage - 100) >= 0.01) {
    throw new QuickSplitExpenseSharesInvalidError({
      reason: 'percentage_total_mismatch',
    });
  }

  const shares: Record<string, number> = {};
  let assigned = 0;

  participantIds.forEach((participantId, index) => {
    const share =
      index === participantIds.length - 1
        ? normalizeAmount(amount - assigned)
        : normalizeAmount(amount * ((percentages[participantId] ?? 0) / 100));

    shares[participantId] = share;
    assigned = normalizeAmount(assigned + share);
  });

  return shares;
}

function mapQuickSplitExpenseFeedItem(
  input: {
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
    participants: Array<{
      share: number;
      participant: {
        id: string;
        userId: string | null;
        name: string;
        user: {
          image: string | null;
          updatedAt: Date;
        } | null;
      };
    }>;
    quickSplit: {
      name: string;
      _count: {
        participants: number;
      };
    };
  },
  userId: string,
): QuickSplitExpenseFeedItem {
  const currentUserShare =
    input.participants.find(({ participant }) => participant.userId === userId)
      ?.share ?? 0;
  const currentUserBalance =
    input.paidByParticipant.userId === userId
      ? input.amount - currentUserShare
      : -currentUserShare;

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
    participants: input.participants.map(({ participant }) => ({
      id: participant.id,
      userId: participant.userId,
      name: participant.name,
      image: resolveUserImageUrl(
        participant.user?.image,
        participant.user?.updatedAt ?? null,
      ),
    })),
    currentUserBalance: normalizeAmount(currentUserBalance),
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
}): CreateQuickSplitExpenseResult {
  const splitMethod = readSplitMethod(input.splitMethod);

  if (!splitMethod) {
    throw new QuickSplitExpenseCreateError({
      cause: new Error('Invalid quick split expense split method'),
    });
  }

  return {
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
  };
}

function normalizeParticipantIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => id.trim()))).filter(
    (id) => id.length > 0,
  );
}

export const quickSplitOperations = {
  async deleteExpense(input: {
    quickSplitId: string;
    expenseId: string;
    userId: string;
  }): Promise<DeleteQuickSplitExpenseResult> {
    let expense: { id: string; quickSplitId: string } | null;

    try {
      expense = await quickSplitsPersistence.findAccessibleExpense(input);
    } catch (cause) {
      throw new QuickSplitExpenseDeleteError({ cause });
    }

    if (!expense) {
      throw new QuickSplitExpenseNotFoundError({
        expenseId: input.expenseId,
      });
    }

    try {
      const deletedExpense = await db.$transaction(async (tx) => {
        const deleted = await quickSplitsPersistence.deleteExpense(
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
      });

      return {
        id: deletedExpense.id,
      };
    } catch (cause) {
      throw new QuickSplitExpenseDeleteError({ cause });
    }
  },

  async getExpenseDetail(input: {
    quickSplitId: string;
    expenseId: string;
    userId: string;
  }): Promise<QuickSplitExpenseDetailResult> {
    let expense: Awaited<
      ReturnType<typeof quickSplitsPersistence.findAccessibleExpenseDetail>
    >;

    try {
      expense = await quickSplitsPersistence.findAccessibleExpenseDetail(input);
    } catch (cause) {
      throw new QuickSplitExpenseDetailError({ cause });
    }

    if (!expense) {
      throw new QuickSplitExpenseNotFoundError({
        expenseId: input.expenseId,
      });
    }

    const participantMeta = new Map(
      expense.quickSplit.participants.map((participant) => [
        participant.id,
        participant,
      ]),
    );
    const splitMethod = readSplitMethod(expense.splitMethod);

    if (!splitMethod) {
      throw new QuickSplitExpenseDetailError({
        cause: new Error('Invalid quick split expense split method'),
      });
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
    };
  },

  async listExpenses(
    input: ListQuickSplitExpensesQueryInput & { userId: string },
  ): Promise<ListQuickSplitExpensesResult> {
    try {
      const [total, rows] = await Promise.all([
        quickSplitsPersistence.countAccessibleExpenses(input.userId),
        quickSplitsPersistence.listAccessibleExpenses(input),
      ]);

      const hasNextPage = rows.length > input.limit;
      const data = hasNextPage ? rows.slice(0, input.limit) : rows;

      return {
        data: data.map((row) =>
          mapQuickSplitExpenseFeedItem(row, input.userId),
        ),
        pagination: {
          limit: input.limit,
          total,
          nextCursor: hasNextPage ? (data.at(-1)?.id ?? null) : null,
        },
      };
    } catch (cause) {
      throw new QuickSplitExpensesListError({ cause });
    }
  },

  async create({
    id,
    userId,
    name,
    description,
    participants,
  }: WithUserId<CreateQuickSplitInput>): Promise<CreateQuickSplitResult> {
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
      throw new QuickSplitParticipantsRequiredError();
    }

    const registeredUserIds = Array.from(
      new Set(
        normalizedParticipants.flatMap((participant) =>
          participant.userId ? [participant.userId] : [],
        ),
      ),
    );

    let registeredUsers: Array<{ id: string; name: string }>;

    try {
      registeredUsers =
        await quickSplitsPersistence.findUsersByIds(registeredUserIds);
    } catch (cause) {
      throw new QuickSplitCreateError({ cause });
    }

    if (registeredUsers.length !== registeredUserIds.length) {
      const foundUserIds = new Set(
        registeredUsers.map((participant) => participant.id),
      );
      const missingUserIds = registeredUserIds.filter(
        (participantUserId) => !foundUserIds.has(participantUserId),
      );

      throw new QuickSplitParticipantsNotFoundError({
        missingUserIds,
      });
    }

    let currentUser: { name: string } | null;

    try {
      currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
    } catch (cause) {
      throw new QuickSplitCreateError({ cause });
    }

    if (!currentUser) {
      throw new QuickSplitCreateError({
        cause: new Error('Quick split owner not found'),
      });
    }

    const now = new Date();
    const quickSplitId = id?.trim() || crypto.randomUUID();
    const normalizedName = name.trim();
    const normalizedDescription = description?.trim() || null;

    try {
      const quickSplit = await quickSplitsPersistence.create({
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
            ? { clientId: normalizedParticipants[index - 1]?.clientId }
            : {}),
          userId: participant.userId,
          name: participant.name,
          role: participant.role,
        })),
        createdAt: quickSplit.createdAt.toISOString(),
      };
    } catch (cause) {
      throw new QuickSplitCreateError({ cause });
    }
  },

  async createExpense(
    input: CreateQuickSplitExpenseInput & {
      userId: string;
      quickSplitId: string;
    },
  ): Promise<CreateQuickSplitExpenseResult> {
    const {
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
    } = input;

    let quickSplit: Awaited<
      ReturnType<typeof quickSplitsPersistence.findAccessibleQuickSplit>
    >;

    try {
      quickSplit = await quickSplitsPersistence.findAccessibleQuickSplit({
        quickSplitId,
        userId,
      });
    } catch (cause) {
      throw new QuickSplitExpenseCreateError({ cause });
    }

    if (!quickSplit) {
      throw new QuickSplitNotFoundError({ quickSplitId });
    }

    const quickSplitParticipantIds = new Set(
      quickSplit.participants.map((participant) => participant.id),
    );
    const normalizedParticipantIds = normalizeParticipantIds(participantIds);

    if (normalizedParticipantIds.length === 0) {
      throw new QuickSplitExpenseParticipantsInvalidError({
        invalidUserIds: [],
      });
    }

    const invalidParticipantIds = normalizedParticipantIds.filter(
      (participantId) => !quickSplitParticipantIds.has(participantId),
    );

    if (invalidParticipantIds.length > 0) {
      throw new QuickSplitExpenseParticipantsInvalidError({
        invalidUserIds: invalidParticipantIds,
      });
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
      throw new QuickSplitExpensePayerInvalidError({
        paidByUserId: normalizedPaidByParticipantId ?? userId,
      });
    }

    const normalizedExpenseId = id?.trim() || undefined;
    const normalizedDescription = description.trim();
    const normalizedAmount = normalizeAmount(amount);
    const normalizedCurrency = currency.trim().toUpperCase();

    if (normalizedExpenseId) {
      let existingExpense: Awaited<
        ReturnType<typeof quickSplitsPersistence.findExpenseById>
      >;

      try {
        existingExpense =
          await quickSplitsPersistence.findExpenseById(normalizedExpenseId);
      } catch (cause) {
        throw new QuickSplitExpenseCreateError({ cause });
      }

      if (existingExpense) {
        if (existingExpense.quickSplitId !== quickSplitId) {
          throw new QuickSplitExpenseSharesInvalidError({
            reason: 'expense_id_already_exists_in_other_quick_split',
          });
        }

        return toCreateExpenseResult(existingExpense);
      }
    }

    const shares =
      splitMethod === 'exact'
        ? createExactShares({
            amount: normalizedAmount,
            participantIds: normalizedParticipantIds,
            exactShares,
          })
        : splitMethod === 'percentage'
          ? createPercentageShares({
              amount: normalizedAmount,
              participantIds: normalizedParticipantIds,
              percentageShares,
            })
          : createEqualShares({
              amount: normalizedAmount,
              participantIds: normalizedParticipantIds,
            });

    const now = new Date();

    try {
      const expense = await db.$transaction(async (tx) => {
        const createdExpense = await quickSplitsPersistence.createExpense(tx, {
          id: normalizedExpenseId,
          quickSplitId,
          paidByParticipantId: normalizedPaidByParticipantId,
          description: normalizedDescription,
          amount: normalizedAmount,
          currency: normalizedCurrency,
          splitMethod,
          shares,
          createdAt: now,
        });

        await tx.quickSplit.update({
          where: { id: quickSplitId },
          data: {
            updatedAt: now,
          },
        });

        return createdExpense;
      });

      return toCreateExpenseResult(expense);
    } catch (cause) {
      throw new QuickSplitExpenseCreateError({ cause });
    }
  },

  async updateExpense(
    input: CreateQuickSplitExpenseInput & {
      userId: string;
      quickSplitId: string;
      expenseId: string;
    },
  ): Promise<CreateQuickSplitExpenseResult> {
    const {
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
    } = input;

    let existingExpense: Awaited<
      ReturnType<typeof quickSplitsPersistence.findAccessibleExpense>
    >;

    try {
      existingExpense = await quickSplitsPersistence.findAccessibleExpense({
        quickSplitId,
        expenseId,
        userId,
      });
    } catch (cause) {
      throw new QuickSplitExpenseCreateError({ cause });
    }

    if (!existingExpense) {
      throw new QuickSplitExpenseNotFoundError({ expenseId });
    }

    let quickSplit: Awaited<
      ReturnType<typeof quickSplitsPersistence.findAccessibleQuickSplit>
    >;

    try {
      quickSplit = await quickSplitsPersistence.findAccessibleQuickSplit({
        quickSplitId,
        userId,
      });
    } catch (cause) {
      throw new QuickSplitExpenseCreateError({ cause });
    }

    if (!quickSplit) {
      throw new QuickSplitNotFoundError({ quickSplitId });
    }

    const quickSplitParticipantIds = new Set(
      quickSplit.participants.map((participant) => participant.id),
    );
    const normalizedParticipantIds = normalizeParticipantIds(participantIds);

    if (normalizedParticipantIds.length === 0) {
      throw new QuickSplitExpenseParticipantsInvalidError({
        invalidUserIds: [],
      });
    }

    const invalidParticipantIds = normalizedParticipantIds.filter(
      (participantId) => !quickSplitParticipantIds.has(participantId),
    );

    if (invalidParticipantIds.length > 0) {
      throw new QuickSplitExpenseParticipantsInvalidError({
        invalidUserIds: invalidParticipantIds,
      });
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
      throw new QuickSplitExpensePayerInvalidError({
        paidByUserId: normalizedPaidByParticipantId ?? userId,
      });
    }

    const normalizedDescription = description.trim();
    const normalizedAmount = normalizeAmount(amount);
    const normalizedCurrency = currency.trim().toUpperCase();

    const shares =
      splitMethod === 'exact'
        ? createExactShares({
            amount: normalizedAmount,
            participantIds: normalizedParticipantIds,
            exactShares,
          })
        : splitMethod === 'percentage'
          ? createPercentageShares({
              amount: normalizedAmount,
              participantIds: normalizedParticipantIds,
              percentageShares,
            })
          : createEqualShares({
              amount: normalizedAmount,
              participantIds: normalizedParticipantIds,
            });

    const now = new Date();

    try {
      const expense = await db.$transaction(async (tx) => {
        const updatedExpense = await quickSplitsPersistence.updateExpense(tx, {
          expenseId,
          paidByParticipantId: normalizedPaidByParticipantId,
          description: normalizedDescription,
          amount: normalizedAmount,
          currency: normalizedCurrency,
          splitMethod,
          shares,
          updatedAt: now,
        });

        await tx.quickSplit.update({
          where: { id: quickSplitId },
          data: {
            updatedAt: now,
          },
        });

        return updatedExpense;
      });

      return toCreateExpenseResult(expense);
    } catch (cause) {
      throw new QuickSplitExpenseCreateError({ cause });
    }
  },
};
