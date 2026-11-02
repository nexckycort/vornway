import type {
  CreateQuickSplit,
  QuickSplitExpenseInput,
  QuickSplitExpensesQuery,
  QuickSplitSettlementInput,
} from '@vornway/contracts/modules/quick-splits/contract';
import {
  QuickSplitExpenseNotFound,
  QuickSplitExpensePayerInvalid,
  QuickSplitExpenseSharesInvalid,
  QuickSplitNotFound,
  QuickSplitParticipantsNotFound,
  QuickSplitParticipantsRequired,
  QuickSplitSettlementAmountInvalid,
  QuickSplitSettlementParticipantsInvalid,
} from '@vornway/contracts/modules/quick-splits/contract';
import { Cursor } from '@vornway/contracts/schema';
import { Context, Effect, Layer } from 'effect';
import { Database, DatabaseError } from '#/infrastructure/database/database';
import { toPage } from '#/infrastructure/database/pagination';
import { normalizeAmount, sameCurrency, splitShares } from './shares';
import { QuickSplitStore } from './store';
import {
  toCreatedQuickSplit,
  toExpenseDetail,
  toExpenseResult,
  toFeedItem,
  toSplitMethod,
} from './views';

const DEFAULT_LIMIT = 12;

const make = Effect.gen(function* () {
  const database = yield* Database;
  const store = yield* QuickSplitStore;

  const internalFailure = (message: string) =>
    database.internal(new DatabaseError({ cause: new Error(message) }));

  const readSplitMethod = (value: string) => {
    const splitMethod = toSplitMethod(value);
    return splitMethod
      ? Effect.succeed(splitMethod)
      : internalFailure('Invalid quick split expense split method');
  };

  const create = Effect.fn('QuickSplits.create')(function* (
    userId: string,
    input: typeof CreateQuickSplit.Type,
  ) {
    const participants = input.participants.filter(
      (participant) => participant.userId !== userId,
    );
    if (participants.length === 0) {
      return yield* new QuickSplitParticipantsRequired();
    }

    const registeredUserIds = Array.from(
      new Set(participants.flatMap((participant) => participant.userId ?? [])),
    );
    const registeredUsers = yield* store.findUsersByIds(registeredUserIds);
    if (registeredUsers.length !== registeredUserIds.length) {
      return yield* new QuickSplitParticipantsNotFound();
    }

    const owner = yield* store.findUserName(userId);
    if (!owner) return yield* internalFailure('Quick split owner not found');

    const quickSplit = yield* store.create({
      id: input.id ?? crypto.randomUUID(),
      ownerId: userId,
      ownerName: owner.name,
      name: input.name,
      description: input.description || null,
      participants,
      createdAt: new Date(),
    });
    return toCreatedQuickSplit(
      quickSplit,
      participants.map((participant) => participant.clientId),
    );
  });

  const createExpense = Effect.fn('QuickSplits.createExpense')(function* (
    userId: string,
    quickSplitId: string,
    input: typeof QuickSplitExpenseInput.Type,
  ) {
    const quickSplit = yield* store.findAccessibleQuickSplit({
      quickSplitId,
      userId,
    });
    if (!quickSplit) return yield* new QuickSplitNotFound();

    const paidByParticipantId = payerOf(quickSplit.participants, userId, input);
    if (!paidByParticipantId) {
      return yield* new QuickSplitExpensePayerInvalid();
    }

    const expenseId = input.id?.trim() || undefined;
    const existing = expenseId ? yield* store.findExpenseById(expenseId) : null;
    if (existing) {
      if (existing.quickSplitId !== quickSplitId) {
        return yield* new QuickSplitExpenseSharesInvalid();
      }
      return toExpenseResult(
        existing,
        yield* readSplitMethod(existing.splitMethod),
      );
    }

    const participantIdByUserId = new Map(
      quickSplit.participants.flatMap((participant) =>
        participant.userId
          ? [[participant.userId, participant.id] as const]
          : [],
      ),
    );
    const remapKeys = (shares: Record<string, number> | undefined) =>
      shares &&
      Object.fromEntries(
        Object.entries(shares).map(([key, share]) => [
          participantIdByUserId.get(key) ?? key,
          share,
        ]),
      );
    const amount = normalizeAmount(input.amount);
    const shares = splitShares({
      method: input.splitMethod,
      amount,
      participantIds: quickSplit.participants.map(
        (participant) => participant.id,
      ),
      percentageShares: remapKeys(input.percentageShares),
      exactShares: remapKeys(input.exactShares),
    });
    if (!shares) return yield* new QuickSplitExpenseSharesInvalid();

    const expense = yield* store.createExpense({
      id: expenseId,
      quickSplitId,
      paidByParticipantId,
      description: input.description,
      amount,
      currency: input.currency.toUpperCase(),
      splitMethod: input.splitMethod,
      shares,
      metadata: input.metadata,
      at: new Date(),
    });
    return toExpenseResult(expense, input.splitMethod);
  });

  const updateExpense = Effect.fn('QuickSplits.updateExpense')(function* (
    userId: string,
    quickSplitId: string,
    expenseId: string,
    input: typeof QuickSplitExpenseInput.Type,
  ) {
    const existing = yield* store.findAccessibleExpense({
      quickSplitId,
      expenseId,
      userId,
    });
    if (!existing) return yield* new QuickSplitExpenseNotFound();

    const quickSplit = yield* store.findAccessibleQuickSplit({
      quickSplitId,
      userId,
    });
    if (!quickSplit) return yield* new QuickSplitNotFound();

    const paidByParticipantId = payerOf(quickSplit.participants, userId, input);
    if (!paidByParticipantId) {
      return yield* new QuickSplitExpensePayerInvalid();
    }

    const amount = normalizeAmount(input.amount);
    const shares = splitShares({
      method: input.splitMethod,
      amount,
      participantIds: quickSplit.participants.map(
        (participant) => participant.id,
      ),
      percentageShares: input.percentageShares,
      exactShares: input.exactShares,
    });
    if (!shares) return yield* new QuickSplitExpenseSharesInvalid();

    const expense = yield* store.updateExpense({
      expenseId,
      quickSplitId,
      paidByParticipantId,
      description: input.description,
      amount,
      currency: input.currency.toUpperCase(),
      splitMethod: input.splitMethod,
      shares,
      metadata: input.metadata,
      at: new Date(),
    });
    return toExpenseResult(expense, input.splitMethod);
  });

  const settleDebt = Effect.fn('QuickSplits.settleDebt')(function* (
    userId: string,
    quickSplitId: string,
    expenseId: string,
    input: typeof QuickSplitSettlementInput.Type,
  ) {
    const expense = yield* store.findAccessibleExpenseDetail({
      quickSplitId,
      expenseId,
      userId,
    });
    if (!expense) return yield* new QuickSplitExpenseNotFound();

    const participants = expense.quickSplit.participants;
    const from = participants.find(
      (participant) => participant.id === input.fromParticipantId,
    );
    const to = participants.find(
      (participant) => participant.id === input.toParticipantId,
    );
    if (!from || !to || from.id === to.id) {
      return yield* new QuickSplitSettlementParticipantsInvalid();
    }

    const currency = input.currency.toUpperCase();
    if (!sameCurrency(currency, expense.currency)) {
      return yield* new QuickSplitSettlementAmountInvalid();
    }

    const alreadySettled = expense.settlements
      .filter(
        (settlement) =>
          settlement.fromParticipantId === from.id &&
          sameCurrency(settlement.currency, currency),
      )
      .reduce((total, settlement) => total + settlement.amount, 0);
    const outstanding = normalizeAmount(from.share - alreadySettled);
    const amount = normalizeAmount(input.amount);
    if (amount > outstanding || outstanding <= 0) {
      return yield* new QuickSplitSettlementAmountInvalid();
    }

    return yield* store.createSettlement({
      expenseId: expense.id,
      quickSplitId,
      fromParticipantId: from.id,
      toParticipantId: to.id,
      amount,
      currency,
      at: new Date(),
    });
  });

  const deleteExpense = Effect.fn('QuickSplits.deleteExpense')(function* (
    userId: string,
    quickSplitId: string,
    expenseId: string,
  ) {
    const expense = yield* store.findAccessibleExpense({
      quickSplitId,
      expenseId,
      userId,
    });
    if (!expense) return yield* new QuickSplitExpenseNotFound();

    const deleted = yield* store.deleteExpense(expense.id);
    return { id: deleted.id };
  });

  const expenseDetail = Effect.fn('QuickSplits.expenseDetail')(function* (
    userId: string,
    quickSplitId: string,
    expenseId: string,
  ) {
    const expense = yield* store.findAccessibleExpenseDetail({
      quickSplitId,
      expenseId,
      userId,
    });
    if (!expense) return yield* new QuickSplitExpenseNotFound();

    return toExpenseDetail(
      expense,
      yield* readSplitMethod(expense.splitMethod),
    );
  });

  const listExpenses = Effect.fn('QuickSplits.listExpenses')(function* (
    userId: string,
    query: typeof QuickSplitExpensesQuery.Type,
  ) {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const { total, rows } = yield* store.listAccessibleExpenses({
      userId,
      limit,
      cursor: query.cursor,
    });
    const page = toPage(rows, limit, total);
    return {
      data: page.data.map((row) => toFeedItem(row, userId)),
      pagination: {
        ...page.pagination,
        nextCursor:
          page.pagination.nextCursor === null
            ? null
            : Cursor.make(page.pagination.nextCursor),
      },
    };
  });

  return {
    create,
    createExpense,
    updateExpense,
    settleDebt,
    deleteExpense,
    expenseDetail,
    listExpenses,
  };
});

const payerOf = (
  participants: readonly { id: string; userId: string | null }[],
  userId: string,
  input: { paidByParticipantId?: string | undefined },
) => {
  const paidBy =
    input.paidByParticipantId?.trim() ||
    participants.find((participant) => participant.userId === userId)?.id;
  return participants.some((participant) => participant.id === paidBy)
    ? paidBy
    : undefined;
};

export class QuickSplits extends Context.Service<
  QuickSplits,
  Effect.Success<typeof make>
>()('vornway/quick-splits/QuickSplits') {
  static readonly layer = Layer.effect(QuickSplits, make).pipe(
    Layer.provide(QuickSplitStore.layer),
  );
}
