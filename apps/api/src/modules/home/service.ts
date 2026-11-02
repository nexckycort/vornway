import type { InternalError } from '@vornway/contracts/errors';
import type { HomeSummary } from '@vornway/contracts/modules/home/contract';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { summarizeDebt, summarizeGoal } from './goal-debt-summary';
import { summarizeGroup } from './group-summary';

const RECENT_LIMIT = 2;

export class Home extends Context.Service<
  Home,
  {
    summary(
      userId: string,
    ): Effect.Effect<typeof HomeSummary.Type, InternalError>;
  }
>()('vornway/home/Home') {
  static readonly layer = Layer.effect(
    Home,
    Effect.gen(function* () {
      const database = yield* Database;

      const summary = Effect.fn('Home.summary')(function* (userId: string) {
        const [groups, currentUser, goals, debts] = yield* Effect.all(
          [
            database.use((db) =>
              db.group.findMany({
                where: {
                  type: { not: 'meta' },
                  OR: [
                    { ownerId: userId },
                    { GroupMember: { some: { userId } } },
                  ],
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: RECENT_LIMIT,
                select: {
                  id: true,
                  name: true,
                  type: true,
                  description: true,
                  imageUrl: true,
                  createdAt: true,
                  updatedAt: true,
                  GroupMember: {
                    select: {
                      id: true,
                      name: true,
                      userId: true,
                      user: { select: { image: true, updatedAt: true } },
                    },
                  },
                  Expense: {
                    where: {
                      status: 'ACTIVE',
                      deletedAt: null,
                      OR: [
                        { notes: null },
                        { notes: { not: { contains: '[DELETED]' } } },
                      ],
                    },
                    select: {
                      amount: true,
                      currency: true,
                      paidById: true,
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
              db.user.findUnique({
                where: { id: userId },
                select: { name: true, image: true, updatedAt: true },
              }),
            ),
            database.use((db) =>
              db.goal.findMany({
                where: {
                  deletedAt: null,
                  group: {
                    OR: [
                      { ownerId: userId },
                      { GroupMember: { some: { userId } } },
                    ],
                  },
                },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                take: RECENT_LIMIT,
                select: {
                  id: true,
                  title: true,
                  description: true,
                  currency: true,
                  targetAmount: true,
                  endDate: true,
                  createdAt: true,
                  group: { select: { id: true, name: true } },
                  contributions: { select: { amount: true } },
                },
              }),
            ),
            database.use((db) =>
              db.debt.findMany({
                where: {
                  OR: [{ ownerId: userId }, { counterpartyId: userId }],
                },
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                take: RECENT_LIMIT,
                select: {
                  id: true,
                  name: true,
                  ownerId: true,
                  counterpartyName: true,
                  direction: true,
                  currency: true,
                  expectedTotal: true,
                  dueDate: true,
                  updatedAt: true,
                  payments: { select: { amount: true } },
                },
              }),
            ),
          ],
          { concurrency: 'unbounded' },
        );

        return {
          groups: groups.map((group) =>
            summarizeGroup(group, userId, currentUser),
          ),
          goals: goals.map(summarizeGoal),
          recentDebts: debts.map((debt) => summarizeDebt(debt, userId)),
        };
      });

      return Home.of({ summary });
    }),
  );
}
