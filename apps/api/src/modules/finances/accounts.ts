import type { InternalError } from '@vornway/contracts/errors';
import type {
  FinanceAccount,
  FinanceAccountPage,
} from '@vornway/contracts/modules/finances/entities';
import {
  CreditCardLimitRequired,
  FinanceAccountNotFound,
} from '@vornway/contracts/modules/finances/errors';
import type {
  AccountMovementListQuery,
  CreateAccountPayload,
  UpdateAccountPayload,
} from '@vornway/contracts/modules/finances/inputs';
import type { AccountMovementPage } from '@vornway/contracts/modules/finances/movements';
import { Cursor, type PageQuery } from '@vornway/contracts/schema';
import { Context, Effect, Layer, Option } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { pageArgs, toPage } from '#/infrastructure/database/pagination';
import { creditAvailable } from './account-balance';
import { money } from './money';
import {
  decodeAccountMovementCursor,
  encodeAccountMovementCursor,
} from './movement-cursor';

type Account = typeof FinanceAccount.Type;

export class FinanceAccounts extends Context.Service<
  FinanceAccounts,
  {
    list(
      userId: string,
      query: PageQuery,
    ): Effect.Effect<typeof FinanceAccountPage.Type, InternalError>;
    get(
      userId: string,
      accountId: string,
    ): Effect.Effect<Account, FinanceAccountNotFound | InternalError>;
    listMovements(
      userId: string,
      accountId: string,
      query: typeof AccountMovementListQuery.Type,
    ): Effect.Effect<
      typeof AccountMovementPage.Type,
      FinanceAccountNotFound | InternalError
    >;
    create(
      userId: string,
      input: typeof CreateAccountPayload.Type,
    ): Effect.Effect<Account, CreditCardLimitRequired | InternalError>;
    update(
      userId: string,
      accountId: string,
      input: typeof UpdateAccountPayload.Type,
    ): Effect.Effect<
      Account,
      FinanceAccountNotFound | CreditCardLimitRequired | InternalError
    >;
    close(
      userId: string,
      accountId: string,
    ): Effect.Effect<Account, FinanceAccountNotFound | InternalError>;
    delete(
      userId: string,
      accountId: string,
    ): Effect.Effect<void, FinanceAccountNotFound | InternalError>;
  }
>()('vornway/finances/FinanceAccounts') {
  static readonly layer = Layer.effect(
    FinanceAccounts,
    Effect.gen(function* () {
      const database = yield* Database;

      const findActive = (userId: string, accountId: string) =>
        database.use((db) =>
          db.financeAccount.findFirst({
            where: { id: accountId, ownerId: userId, archivedAt: null },
          }),
        );

      const requireActive = Effect.fn('FinanceAccounts.requireActive')(
        function* (userId: string, accountId: string) {
          const account = yield* findActive(userId, accountId);
          if (!account) return yield* new FinanceAccountNotFound();
          return account;
        },
      );

      const list = Effect.fn('FinanceAccounts.list')(function* (
        userId: string,
        query: PageQuery,
      ) {
        const where = { ownerId: userId, archivedAt: null };
        const { limit, args } = pageArgs(query);
        const [total, rows] = yield* Effect.all(
          [
            database.use((db) => db.financeAccount.count({ where })),
            database.use((db) =>
              db.financeAccount.findMany({ where, ...args }),
            ),
          ],
          { concurrency: 'unbounded' },
        );
        return withCursor(toPage(rows, limit, total));
      });

      const get = Effect.fn('FinanceAccounts.get')(function* (
        userId: string,
        accountId: string,
      ) {
        return yield* requireActive(userId, accountId);
      });

      const listMovements = Effect.fn('FinanceAccounts.listMovements')(
        function* (
          userId: string,
          accountId: string,
          query: typeof AccountMovementListQuery.Type,
        ) {
          yield* requireActive(userId, accountId);

          const { limit } = query;
          const cursor = Option.getOrUndefined(
            query.cursor === undefined
              ? Option.none()
              : decodeAccountMovementCursor(query.cursor),
          );
          const transactionWhere = {
            ownerId: userId,
            accountId,
            ...(cursor && {
              OR: [
                { occurredAt: { lt: cursor.occurredAt } },
                { occurredAt: cursor.occurredAt, id: { lt: cursor.id } },
              ],
            }),
          };
          const expenseWhere = {
            accountId,
            status: 'ACTIVE' as const,
            ...(cursor && {
              OR: [
                { date: { lt: cursor.occurredAt } },
                { date: cursor.occurredAt, id: { lt: cursor.id } },
              ],
            }),
          };

          const [transactionTotal, expenseTotal, transactions, expenses] =
            yield* Effect.all(
              [
                database.use((db) =>
                  db.financeTransaction.count({
                    where: { ownerId: userId, accountId },
                  }),
                ),
                database.use((db) => db.expense.count({ where: expenseWhere })),
                database.use((db) =>
                  db.financeTransaction.findMany({
                    where: transactionWhere,
                    take: limit + 1,
                    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
                    include: {
                      category: true,
                      tags: { include: { tag: true } },
                    },
                  }),
                ),
                database.use((db) =>
                  db.expense.findMany({
                    where: expenseWhere,
                    take: limit + 1,
                    orderBy: [{ date: 'desc' }, { id: 'desc' }],
                    select: {
                      id: true,
                      description: true,
                      amount: true,
                      currency: true,
                      date: true,
                      accountId: true,
                      categoryId: true,
                      category: {
                        select: {
                          id: true,
                          name: true,
                          icon: true,
                          color: true,
                        },
                      },
                      group: { select: { id: true, name: true } },
                    },
                  }),
                ),
              ],
              { concurrency: 'unbounded' },
            );

          const movements = [
            ...transactions.map((transaction) => ({
              source: 'transaction' as const,
              id: transaction.id,
              description: transaction.description,
              amount: transaction.amount,
              currency: transaction.currency,
              occurredAt: transaction.occurredAt.toISOString(),
              type:
                transaction.type === 'INCOME'
                  ? ('INCOME' as const)
                  : ('EXPENSE' as const),
              accountId: transaction.accountId,
              categoryId: transaction.categoryId,
              category: transaction.category,
              tags: transaction.tags.map((link) => link.tag),
            })),
            ...expenses.map((expense) => ({
              source: 'group-expense' as const,
              id: expense.id,
              description: expense.description,
              amount: expense.amount,
              currency: expense.currency,
              occurredAt: expense.date.toISOString(),
              type: 'EXPENSE' as const,
              accountId: expense.accountId,
              categoryId: expense.categoryId,
              category: expense.category,
              tags: [],
              groupId: expense.group.id,
              groupName: expense.group.name,
            })),
          ].sort(
            (left, right) =>
              new Date(right.occurredAt).getTime() -
                new Date(left.occurredAt).getTime() ||
              right.id.localeCompare(left.id),
          );
          const data = movements.slice(0, limit);
          const last = data.at(-1);

          return {
            data,
            pagination: {
              limit,
              total: transactionTotal + expenseTotal,
              nextCursor:
                movements.length > limit && last
                  ? Cursor.make(encodeAccountMovementCursor(last))
                  : null,
            },
          };
        },
      );

      const create = Effect.fn('FinanceAccounts.create')(function* (
        userId: string,
        input: typeof CreateAccountPayload.Type,
      ) {
        const accountType = toAccountType(input.type);
        const currentBalance = money(input.currentBalance);
        const creditLimit =
          input.creditLimit === undefined ? null : money(input.creditLimit);
        if (accountType === 'CREDIT_CARD' && creditLimit === null) {
          return yield* new CreditCardLimitRequired();
        }
        const usedCredit =
          accountType === 'CREDIT_CARD'
            ? money(Math.max(currentBalance, 0))
            : 0;
        const availableBalance =
          accountType === 'CREDIT_CARD'
            ? money(
                input.availableBalance ??
                  creditAvailable(creditLimit, usedCredit),
              )
            : money(input.availableBalance ?? currentBalance);

        return yield* database.use((db) =>
          db.financeAccount.create({
            data: {
              ownerId: userId,
              name: input.name,
              accountType,
              institution: input.institution || null,
              currency: input.currency,
              openingBalance: currentBalance,
              currentBalance,
              availableBalance,
              lockedBalance: money(input.lockedBalance ?? 0),
              creditLimit,
              usedCredit,
              openedAt: input.openedAt ?? null,
              maturesAt: input.maturesAt ?? null,
              interestRate: input.interestRate ?? null,
              notes: input.notes || null,
            },
          }),
        );
      });

      const update = Effect.fn('FinanceAccounts.update')(function* (
        userId: string,
        accountId: string,
        input: typeof UpdateAccountPayload.Type,
      ) {
        const account = yield* requireActive(userId, accountId);
        const accountType = input.type
          ? toAccountType(input.type)
          : account.accountType;
        const currentBalance =
          input.currentBalance === undefined
            ? account.currentBalance
            : money(input.currentBalance);
        const creditLimit =
          input.creditLimit === undefined
            ? account.creditLimit
            : money(input.creditLimit);
        if (accountType === 'CREDIT_CARD' && creditLimit === null) {
          return yield* new CreditCardLimitRequired();
        }
        const usedCredit =
          accountType === 'CREDIT_CARD'
            ? money(Math.max(currentBalance, 0))
            : 0;
        const availableBalance =
          input.availableBalance === undefined
            ? accountType === 'CREDIT_CARD' &&
              (input.currentBalance !== undefined ||
                input.creditLimit !== undefined ||
                input.type !== undefined)
              ? creditAvailable(creditLimit, usedCredit)
              : undefined
            : money(input.availableBalance);

        return yield* database.use((db) =>
          db.financeAccount.update({
            where: { id: accountId },
            data: {
              ...(input.name ? { name: input.name } : {}),
              ...(input.type ? { accountType } : {}),
              ...(input.institution === undefined
                ? {}
                : { institution: input.institution || null }),
              ...(input.currency ? { currency: input.currency } : {}),
              ...(input.currentBalance === undefined ? {} : { currentBalance }),
              ...(availableBalance === undefined ? {} : { availableBalance }),
              ...(input.lockedBalance === undefined
                ? {}
                : { lockedBalance: money(input.lockedBalance) }),
              ...(input.type !== undefined ||
              input.creditLimit !== undefined ||
              accountType === 'CREDIT_CARD'
                ? {
                    creditLimit:
                      accountType === 'CREDIT_CARD' ? creditLimit : null,
                    usedCredit,
                  }
                : {}),
              ...(input.openedAt === undefined
                ? {}
                : { openedAt: input.openedAt }),
              ...(input.maturesAt === undefined
                ? {}
                : { maturesAt: input.maturesAt }),
              ...(input.interestRate === undefined
                ? {}
                : { interestRate: input.interestRate }),
              ...(input.notes === undefined
                ? {}
                : { notes: input.notes || null }),
              ...(input.status
                ? {
                    status: toAccountStatus(input.status),
                    closedAt: input.status === 'closed' ? new Date() : null,
                  }
                : {}),
            },
          }),
        );
      });

      const close = Effect.fn('FinanceAccounts.close')(function* (
        userId: string,
        accountId: string,
      ) {
        yield* requireActive(userId, accountId);
        return yield* database.use((db) =>
          db.financeAccount.update({
            where: { id: accountId },
            data: { status: 'CLOSED', closedAt: new Date() },
          }),
        );
      });

      const remove = Effect.fn('FinanceAccounts.delete')(function* (
        userId: string,
        accountId: string,
      ) {
        yield* requireActive(userId, accountId);
        yield* database.use((db) =>
          db.financeAccount.update({
            where: { id: accountId },
            data: { archivedAt: new Date() },
          }),
        );
      });

      return FinanceAccounts.of({
        list,
        get,
        listMovements,
        create,
        update,
        close,
        delete: remove,
      });
    }),
  );
}

const withCursor = <
  Row,
  Pagination extends { nextCursor: string | null },
>(page: {
  data: readonly Row[];
  pagination: Pagination;
}) => ({
  data: page.data,
  pagination: {
    ...page.pagination,
    nextCursor:
      page.pagination.nextCursor === null
        ? null
        : Cursor.make(page.pagination.nextCursor),
  },
});

const toAccountType = (type: typeof CreateAccountPayload.Type.type) => {
  const accountTypes = {
    cash: 'CASH',
    bank: 'BANK',
    savings: 'SAVINGS',
    credit_card: 'CREDIT_CARD',
    term_deposit: 'TERM_DEPOSIT',
    wallet: 'WALLET',
    other: 'OTHER',
  } as const;
  return accountTypes[type];
};

const toAccountStatus = (
  status: NonNullable<typeof UpdateAccountPayload.Type.status>,
) => {
  const statuses = {
    active: 'ACTIVE',
    closed: 'CLOSED',
    matured: 'MATURED',
  } as const;
  return statuses[status];
};
