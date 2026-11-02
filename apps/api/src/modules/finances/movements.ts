import type { InternalError } from '@vornway/contracts/errors';
import type { MovementListQuery } from '@vornway/contracts/modules/finances/inputs';
import type {
  FinanceMovement,
  FinanceMovementPage,
} from '@vornway/contracts/modules/finances/movements';
import { Cursor } from '@vornway/contracts/schema';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { monthRange } from './calendar';
import { FinanceDefaults } from './defaults';
import { groupExpenseShare } from './group-expenses';
import {
  compareMovements,
  decodeMovementCursor,
  encodeMovementCursor,
  isMovementAfterCursor,
} from './movement-cursor';
import { debtViewerDirection } from './totals';

type Movement = typeof FinanceMovement.Type;

export class FinanceMovements extends Context.Service<
  FinanceMovements,
  {
    list(
      userId: string,
      query: typeof MovementListQuery.Type,
    ): Effect.Effect<typeof FinanceMovementPage.Type, InternalError>;
  }
>()('vornway/finances/FinanceMovements') {
  static readonly layer = Layer.effect(
    FinanceMovements,
    Effect.gen(function* () {
      const database = yield* Database;
      const defaults = yield* FinanceDefaults;

      const list = Effect.fn('FinanceMovements.list')(function* (
        userId: string,
        query: typeof MovementListQuery.Type,
      ) {
        yield* defaults.ensure(userId, query.currency);
        const range = monthRange(query.month, query.timeZone);
        const { limit } = query;
        const cursor = decodeMovementCursor(query.cursor);
        const upToCursor = cursor ? { lte: cursor.occurredAt } : {};
        const inRange = { gte: range.start, lt: range.end };
        const involvesUser = {
          OR: [{ ownerId: userId }, { counterpartyId: userId }],
        };
        const debtSelect = {
          id: true,
          ownerId: true,
          name: true,
          counterpartyName: true,
          direction: true,
          currency: true,
        } as const;
        const activeExpense = {
          status: 'ACTIVE' as const,
          deletedAt: null,
          OR: [{ notes: null }, { notes: { not: { contains: '[DELETED]' } } }],
          group: {
            Goal: { none: {} },
            OR: [{ ownerId: userId }, { GroupMember: { some: { userId } } }],
          },
          AND: [
            {
              OR: [
                { participants: { some: { member: { userId } } } },
                {
                  group: {
                    type: 'personal',
                    GroupMember: { some: { userId } },
                  },
                  participants: { none: {} },
                },
              ],
            },
          ],
        };

        const [
          transactionTotal,
          groupExpenseTotal,
          debtPaymentTotal,
          debtLoanTotal,
          transactions,
          expenses,
          debtPayments,
          debtLoans,
        ] = yield* Effect.all(
          [
            database.use((db) =>
              db.financeTransaction.count({
                where: { ownerId: userId, occurredAt: inRange },
              }),
            ),
            database.use((db) =>
              db.expense.count({ where: { ...activeExpense, date: inRange } }),
            ),
            database.use((db) =>
              db.debtPayment.count({
                where: { paidAt: inRange, debt: involvesUser },
              }),
            ),
            database.use((db) =>
              db.debtAmount.count({
                where: { loanDate: inRange, debt: involvesUser },
              }),
            ),
            database.use((db) =>
              db.financeTransaction.findMany({
                where: {
                  ownerId: userId,
                  occurredAt: { ...inRange, ...upToCursor },
                },
                take: limit + 1,
                orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
                include: {
                  category: true,
                  account: { select: { name: true } },
                  tags: { include: { tag: true } },
                },
              }),
            ),
            database.use((db) =>
              db.expense.findMany({
                where: {
                  ...activeExpense,
                  date: { ...inRange, ...upToCursor },
                },
                take: limit + 1,
                orderBy: [{ date: 'desc' }, { id: 'desc' }],
                select: {
                  id: true,
                  amount: true,
                  currency: true,
                  date: true,
                  description: true,
                  category: {
                    select: { id: true, name: true, icon: true, color: true },
                  },
                  group: {
                    select: {
                      id: true,
                      name: true,
                      type: true,
                      GroupMember: { where: { userId }, select: { id: true } },
                    },
                  },
                  payers: { select: { memberId: true, amount: true } },
                  participants: { select: { memberId: true, share: true } },
                },
              }),
            ),
            database.use((db) =>
              db.debtPayment.findMany({
                where: {
                  paidAt: { ...inRange, ...upToCursor },
                  debt: involvesUser,
                },
                take: limit + 1,
                orderBy: [{ paidAt: 'desc' }, { id: 'desc' }],
                select: {
                  id: true,
                  amount: true,
                  paidAt: true,
                  debt: { select: debtSelect },
                },
              }),
            ),
            database.use((db) =>
              db.debtAmount.findMany({
                where: {
                  loanDate: { ...inRange, ...upToCursor },
                  debt: involvesUser,
                },
                take: limit + 1,
                orderBy: [{ loanDate: 'desc' }, { id: 'desc' }],
                select: {
                  id: true,
                  amount: true,
                  loanDate: true,
                  accountId: true,
                  account: { select: { name: true } },
                  debt: { select: debtSelect },
                },
              }),
            ),
          ],
          { concurrency: 'unbounded' },
        );

        const transactionMovements = transactions.map(
          (transaction): Movement => ({
            source: 'transaction',
            id: transaction.id,
            description: transaction.description,
            amount: transaction.amount,
            currency: transaction.currency,
            occurredAt: transaction.occurredAt.toISOString(),
            type: transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
            accountId: transaction.accountId,
            accountName: transaction.account?.name ?? null,
            categoryId: transaction.categoryId,
            category: transaction.category,
            tags: transaction.tags.map((link) => link.tag),
          }),
        );

        const groupExpenseMovements = expenses.flatMap(
          (expense): Movement[] => {
            const memberId = expense.group.GroupMember[0]?.id;
            if (!memberId) return [];
            const share = groupExpenseShare(
              expense,
              expense.group.type,
              memberId,
            );
            if (!share) return [];

            return [
              {
                source: 'group-expense',
                id: expense.id,
                groupId: expense.group.id,
                groupName: expense.group.name,
                groupType: expense.group.type,
                description: expense.description,
                amount: expense.amount,
                userShare: share.userShare,
                currentUserBalance: share.currentUserBalance,
                currency: expense.currency,
                occurredAt: expense.date.toISOString(),
                category: expense.category,
              },
            ];
          },
        );

        const debtPaymentMovements = debtPayments.map(
          (payment): Movement => ({
            source: 'debt-payment',
            id: payment.id,
            debtId: payment.debt.id,
            debtName: payment.debt.name,
            counterpartyName: payment.debt.counterpartyName,
            description: payment.debt.name,
            amount: payment.amount,
            currency: payment.debt.currency,
            occurredAt: payment.paidAt.toISOString(),
            type:
              debtViewerDirection(payment.debt, userId) === 'lent'
                ? 'INCOME'
                : 'EXPENSE',
          }),
        );

        const debtLoanMovements = debtLoans.map(
          (loan): Movement => ({
            source: 'debt-loan',
            id: loan.id,
            debtId: loan.debt.id,
            debtName: loan.debt.name,
            counterpartyName: loan.debt.counterpartyName,
            description: loan.debt.name,
            amount: loan.amount,
            currency: loan.debt.currency,
            occurredAt: loan.loanDate.toISOString(),
            type:
              debtViewerDirection(loan.debt, userId) === 'lent'
                ? 'EXPENSE'
                : 'INCOME',
            accountId: loan.accountId,
            accountName: loan.account?.name ?? null,
          }),
        );

        const movements = [
          ...transactionMovements,
          ...groupExpenseMovements,
          ...debtLoanMovements,
          ...debtPaymentMovements,
        ]
          .filter((movement) => isMovementAfterCursor(movement, cursor))
          .sort(compareMovements);
        const data = movements.slice(0, limit);
        const last = data.at(-1);

        return {
          data,
          pagination: {
            limit,
            total:
              transactionTotal +
              groupExpenseTotal +
              debtPaymentTotal +
              debtLoanTotal,
            nextCursor:
              movements.length > limit && last
                ? Cursor.make(encodeMovementCursor(last))
                : null,
          },
        };
      });

      return FinanceMovements.of({ list });
    }),
  );
}
