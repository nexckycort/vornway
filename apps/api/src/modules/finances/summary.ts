import type { InternalError } from '@vornway/contracts/errors';
import type { SummaryQuery } from '@vornway/contracts/modules/finances/inputs';
import type { FinanceSummary } from '@vornway/contracts/modules/finances/summary';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { monthRange } from './calendar';
import { FinanceDefaults } from './defaults';
import { buildSummary, RECENT_LIMIT } from './summary-report';
import { debtTotals, goalTotals, groupExpenseTotals } from './totals';

export class FinanceOverview extends Context.Service<
  FinanceOverview,
  {
    summary(
      userId: string,
      query: typeof SummaryQuery.Type,
    ): Effect.Effect<typeof FinanceSummary.Type, InternalError>;
  }
>()('vornway/finances/FinanceOverview') {
  static readonly layer = Layer.effect(
    FinanceOverview,
    Effect.gen(function* () {
      const database = yield* Database;
      const defaults = yield* FinanceDefaults;

      const summary = Effect.fn('FinanceOverview.summary')(function* (
        userId: string,
        query: typeof SummaryQuery.Type,
      ) {
        yield* defaults.ensure(userId, query.currency);
        const range = monthRange(query.month, query.timeZone);
        const involvesUser = {
          OR: [{ ownerId: userId }, { counterpartyId: userId }],
        };
        const paidInRange = { gte: range.start, lt: range.end };
        const debtSelect = {
          amount: true,
          debt: { select: { ownerId: true, direction: true, currency: true } },
        } as const;

        const [
          transactions,
          categories,
          accounts,
          tags,
          budgets,
          groups,
          debts,
          debtPayments,
          debtLoans,
          goals,
        ] = yield* Effect.all(
          [
            database.use((db) =>
              db.financeTransaction.findMany({
                where: { ownerId: userId, occurredAt: paidInRange },
                include: {
                  category: true,
                  account: true,
                  tags: { include: { tag: true } },
                },
                orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
              }),
            ),
            database.use((db) =>
              db.financeCategory.findMany({
                where: { ownerId: userId, archivedAt: null },
                orderBy: [{ transactionType: 'asc' }, { name: 'asc' }],
              }),
            ),
            database.use((db) =>
              db.financeAccount.findMany({
                where: { ownerId: userId, archivedAt: null },
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              }),
            ),
            database.use((db) =>
              db.financeTag.findMany({
                where: { ownerId: userId },
                orderBy: [{ name: 'asc' }],
              }),
            ),
            database.use((db) =>
              db.financeBudget.findMany({
                where: { ownerId: userId, month: range.budgetMonth },
                include: { category: true },
              }),
            ),
            database.use((db) =>
              db.group.findMany({
                where: {
                  Goal: { none: {} },
                  OR: [
                    { ownerId: userId },
                    { GroupMember: { some: { userId } } },
                  ],
                },
                select: {
                  id: true,
                  name: true,
                  type: true,
                  GroupMember: { where: { userId }, select: { id: true } },
                  Expense: {
                    where: {
                      status: 'ACTIVE',
                      deletedAt: null,
                      date: { gte: range.start, lt: range.end },
                      OR: [
                        { notes: null },
                        { notes: { not: { contains: '[DELETED]' } } },
                      ],
                    },
                    select: {
                      id: true,
                      amount: true,
                      currency: true,
                      date: true,
                      description: true,
                      metadata: true,
                      category: {
                        select: {
                          id: true,
                          name: true,
                          icon: true,
                          color: true,
                        },
                      },
                      payers: { select: { memberId: true, amount: true } },
                      participants: {
                        select: { memberId: true, share: true },
                      },
                    },
                  },
                },
              }),
            ),
            database.use((db) =>
              db.debt.findMany({
                where: involvesUser,
                select: {
                  ownerId: true,
                  direction: true,
                  currency: true,
                  expectedTotal: true,
                  payments: { select: { amount: true } },
                },
              }),
            ),
            database.use((db) =>
              db.debtPayment.findMany({
                where: { paidAt: paidInRange, debt: involvesUser },
                select: debtSelect,
              }),
            ),
            database.use((db) =>
              db.debtAmount.findMany({
                where: { loanDate: paidInRange, debt: involvesUser },
                select: debtSelect,
              }),
            ),
            database.use((db) =>
              db.goal.findMany({
                where: {
                  deletedAt: null,
                  completedAt: null,
                  group: {
                    OR: [
                      { ownerId: userId },
                      { GroupMember: { some: { userId } } },
                    ],
                  },
                },
                select: {
                  currency: true,
                  targetAmount: true,
                  contributions: { select: { amount: true } },
                },
              }),
            ),
          ],
          { concurrency: 'unbounded' },
        );

        return {
          ...buildSummary({
            userId,
            currency: query.currency,
            monthKey: range.key,
            transactions,
            accounts,
            groupExpenses: groupExpenseTotals(groups),
            debts: debtTotals(debts, userId),
            debtPayments,
            debtLoans,
            goals: goalTotals(goals),
          }),
          categories,
          accounts,
          tags,
          budgets,
          recentTransactions: transactions
            .slice(0, RECENT_LIMIT)
            .map((transaction) => ({
              ...transaction,
              tags: transaction.tags.map((link) => link.tag),
            })),
        };
      });

      return FinanceOverview.of({ summary });
    }),
  );
}
