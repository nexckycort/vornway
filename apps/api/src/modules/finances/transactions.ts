import type { InternalError } from '@vornway/contracts/errors';
import type {
  FinanceTransaction,
  FinanceTransactionWithTagLinks,
} from '@vornway/contracts/modules/finances/entities';
import {
  FinanceTransactionNotFound,
  InvalidFinanceAccount,
  InvalidFinanceCategory,
} from '@vornway/contracts/modules/finances/errors';
import type {
  CreateTransactionPayload,
  UpdateTransactionPayload,
} from '@vornway/contracts/modules/finances/inputs';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { applyAccountTransactionEffect } from './account-balance';
import { monthRange } from './calendar';
import { FinanceDefaults } from './defaults';
import { money } from './money';
import { RECENT_LIMIT } from './summary-report';
import { normalizeTags, tagCreates } from './tags';

const transactionInclude = {
  category: true,
  account: true,
  tags: { include: { tag: true } },
} as const;

export class FinanceTransactions extends Context.Service<
  FinanceTransactions,
  {
    recent(
      userId: string,
      limit: number,
    ): Effect.Effect<(typeof FinanceTransaction.Type)[], InternalError>;
    create(
      userId: string,
      input: typeof CreateTransactionPayload.Type,
    ): Effect.Effect<
      typeof FinanceTransactionWithTagLinks.Type,
      InvalidFinanceCategory | InvalidFinanceAccount | InternalError
    >;
    get(
      userId: string,
      transactionId: string,
    ): Effect.Effect<
      typeof FinanceTransaction.Type,
      FinanceTransactionNotFound | InternalError
    >;
    update(
      userId: string,
      transactionId: string,
      input: typeof UpdateTransactionPayload.Type,
    ): Effect.Effect<
      typeof FinanceTransactionWithTagLinks.Type,
      | FinanceTransactionNotFound
      | InvalidFinanceCategory
      | InvalidFinanceAccount
      | InternalError
    >;
    delete(
      userId: string,
      transactionId: string,
    ): Effect.Effect<void, FinanceTransactionNotFound | InternalError>;
  }
>()('vornway/finances/FinanceTransactions') {
  static readonly layer = Layer.effect(
    FinanceTransactions,
    Effect.gen(function* () {
      const database = yield* Database;
      const defaults = yield* FinanceDefaults;

      const findOwned = (userId: string, transactionId: string) =>
        database.use((db) =>
          db.financeTransaction.findFirst({
            where: { id: transactionId, ownerId: userId },
            select: { id: true, accountId: true, type: true, amount: true },
          }),
        );

      const requireOwned = Effect.fn('FinanceTransactions.requireOwned')(
        function* (userId: string, transactionId: string) {
          const transaction = yield* findOwned(userId, transactionId);
          if (!transaction) return yield* new FinanceTransactionNotFound();
          return transaction;
        },
      );

      const requireCategory = Effect.fn('FinanceTransactions.requireCategory')(
        function* (
          userId: string,
          categoryId: string | null | undefined,
          type: 'INCOME' | 'EXPENSE' | 'BOTH',
        ) {
          if (!categoryId) return;
          const category = yield* database.use((db) =>
            db.financeCategory.findFirst({
              where: {
                id: categoryId,
                ownerId: userId,
                OR: [{ transactionType: type }, { transactionType: 'BOTH' }],
              },
              select: { id: true },
            }),
          );
          if (!category) return yield* new InvalidFinanceCategory();
        },
      );

      const requireAccount = Effect.fn('FinanceTransactions.requireAccount')(
        function* (userId: string, accountId: string | null | undefined) {
          if (!accountId) return;
          const account = yield* database.use((db) =>
            db.financeAccount.findFirst({
              where: {
                id: accountId,
                ownerId: userId,
                archivedAt: null,
                status: { not: 'CLOSED' },
              },
              select: { id: true },
            }),
          );
          if (!account) return yield* new InvalidFinanceAccount();
        },
      );

      const recent = Effect.fn('FinanceTransactions.recent')(function* (
        userId: string,
        limit: number,
      ) {
        yield* defaults.ensure(userId, 'COP');
        const range = monthRange();
        const transactions = yield* database.use((db) =>
          db.financeTransaction.findMany({
            where: {
              ownerId: userId,
              occurredAt: { gte: range.start, lt: range.end },
            },
            include: transactionInclude,
            orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
            take: Math.min(limit, RECENT_LIMIT),
          }),
        );
        return transactions.map((transaction) => ({
          ...transaction,
          tags: transaction.tags.map((link) => link.tag),
        }));
      });

      const create = Effect.fn('FinanceTransactions.create')(function* (
        userId: string,
        input: typeof CreateTransactionPayload.Type,
      ) {
        yield* defaults.ensure(userId, input.currency);
        const type = input.type === 'income' ? 'INCOME' : 'EXPENSE';
        const tags = normalizeTags(input.tags);
        yield* requireCategory(userId, input.categoryId, type);
        yield* requireAccount(userId, input.accountId);

        return yield* database.transaction(async (tx) => {
          const transaction = await tx.financeTransaction.create({
            data: {
              ownerId: userId,
              accountId: input.accountId,
              categoryId: input.categoryId,
              type,
              amount: money(input.amount),
              currency: input.currency,
              description: input.description,
              occurredAt: input.occurredAt ?? new Date(),
              notes: input.notes,
              ...(tags.length > 0
                ? { tags: { create: tagCreates(userId, tags) } }
                : {}),
            },
            include: transactionInclude,
          });
          await applyAccountTransactionEffect(tx, transaction, 1);
          return transaction;
        });
      });

      const get = Effect.fn('FinanceTransactions.get')(function* (
        userId: string,
        transactionId: string,
      ) {
        const transaction = yield* database.use((db) =>
          db.financeTransaction.findFirst({
            where: { id: transactionId, ownerId: userId },
            include: transactionInclude,
          }),
        );
        if (!transaction) return yield* new FinanceTransactionNotFound();
        return {
          ...transaction,
          tags: transaction.tags.map((link) => link.tag),
        };
      });

      const update = Effect.fn('FinanceTransactions.update')(function* (
        userId: string,
        transactionId: string,
        input: typeof UpdateTransactionPayload.Type,
      ) {
        const transaction = yield* requireOwned(userId, transactionId);
        const tags =
          input.tags === undefined ? undefined : normalizeTags(input.tags);
        yield* requireCategory(userId, input.categoryId, transaction.type);
        yield* requireAccount(userId, input.accountId);

        return yield* database.transaction(async (tx) => {
          if (tags) {
            await tx.financeTransactionTag.deleteMany({
              where: { transactionId },
            });
          }

          await applyAccountTransactionEffect(tx, transaction, -1);

          const updated = await tx.financeTransaction.update({
            where: { id: transactionId },
            data: {
              ...(input.description ? { description: input.description } : {}),
              ...(input.amount === undefined
                ? {}
                : { amount: money(input.amount) }),
              ...(input.occurredAt === undefined
                ? {}
                : { occurredAt: input.occurredAt }),
              ...(input.categoryId === undefined
                ? {}
                : { categoryId: input.categoryId }),
              ...(input.accountId === undefined
                ? {}
                : { accountId: input.accountId }),
              ...(tags ? { tags: { create: tagCreates(userId, tags) } } : {}),
            },
            include: transactionInclude,
          });
          await applyAccountTransactionEffect(tx, updated, 1);
          return updated;
        });
      });

      const remove = Effect.fn('FinanceTransactions.delete')(function* (
        userId: string,
        transactionId: string,
      ) {
        const transaction = yield* requireOwned(userId, transactionId);
        yield* database.transaction(async (tx) => {
          await tx.financeTransaction.delete({ where: { id: transactionId } });
          await applyAccountTransactionEffect(tx, transaction, -1);
        });
      });

      return FinanceTransactions.of({
        recent,
        create,
        get,
        update,
        delete: remove,
      });
    }),
  );
}
