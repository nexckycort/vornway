import type { Cursor } from '@vornway/contracts/schema';
import { Context, Effect, Layer } from 'effect';
import type { Prisma } from '#/generated/prisma/client';
import { Database } from '#/infrastructure/database/database';
import { pageArgs } from '#/infrastructure/database/pagination';

type SplitMethod = 'equal' | 'percentage' | 'exact';

type ExpenseWrite = {
  paidByParticipantId: string;
  description: string;
  amount: number;
  currency: string;
  splitMethod: SplitMethod;
  shares: Record<string, number>;
  metadata: Prisma.InputJsonObject | undefined;
  at: Date;
};

const participantsInOrder = {
  select: { id: true, userId: true, name: true, role: true, share: true },
  orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
} satisfies Prisma.QuickSplit$participantsArgs;

const userImage = {
  select: { image: true, updatedAt: true },
} satisfies Prisma.UserDefaultArgs;

const expenseWithShares = {
  id: true,
  quickSplitId: true,
  description: true,
  amount: true,
  currency: true,
  paidByParticipantId: true,
  splitMethod: true,
  createdAt: true,
  quickSplit: {
    select: {
      participants: {
        select: { id: true, share: true },
        orderBy: [{ id: 'asc' }],
      },
    },
  },
} satisfies Prisma.QuickSplitExpenseSelect;

const accessibleBy = (userId: string) =>
  ({
    participants: { some: { userId } },
  }) satisfies Prisma.QuickSplitWhereInput;

const make = Effect.gen(function* () {
  const database = yield* Database;

  const findUsersByIds = Effect.fn('QuickSplitStore.findUsersByIds')(
    (userIds: string[]) =>
      database.use((db) =>
        db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        }),
      ),
  );

  const findUserName = Effect.fn('QuickSplitStore.findUserName')(
    (userId: string) =>
      database.use((db) =>
        db.user.findUnique({ where: { id: userId }, select: { name: true } }),
      ),
  );

  const create = Effect.fn('QuickSplitStore.create')(
    (input: {
      id: string;
      ownerId: string;
      ownerName: string;
      name: string;
      description: string | null;
      participants: readonly { name: string; userId?: string }[];
      createdAt: Date;
    }) =>
      database.use((db) =>
        db.quickSplit.create({
          data: {
            id: input.id,
            ownerId: input.ownerId,
            name: input.name,
            description: input.description,
            createdAt: input.createdAt,
            updatedAt: input.createdAt,
            participants: {
              create: [
                {
                  userId: input.ownerId,
                  name: input.ownerName,
                  role: 'owner',
                  joinedAt: input.createdAt,
                },
                ...input.participants.map((participant) => ({
                  userId: participant.userId,
                  name: participant.name,
                  role: 'participant',
                  joinedAt: input.createdAt,
                })),
              ],
            },
          },
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            participants: participantsInOrder,
          },
        }),
      ),
  );

  const findAccessibleQuickSplit = Effect.fn(
    'QuickSplitStore.findAccessibleQuickSplit',
  )((input: { quickSplitId: string; userId: string }) =>
    database.use((db) =>
      db.quickSplit.findFirst({
        where: { id: input.quickSplitId, ...accessibleBy(input.userId) },
        select: { id: true, participants: participantsInOrder },
      }),
    ),
  );

  const findExpenseById = Effect.fn('QuickSplitStore.findExpenseById')(
    (expenseId: string) =>
      database.use((db) =>
        db.quickSplitExpense.findUnique({
          where: { id: expenseId },
          select: expenseWithShares,
        }),
      ),
  );

  const findAccessibleExpense = Effect.fn(
    'QuickSplitStore.findAccessibleExpense',
  )((input: { quickSplitId: string; expenseId: string; userId: string }) =>
    database.use((db) =>
      db.quickSplitExpense.findFirst({
        where: {
          id: input.expenseId,
          quickSplitId: input.quickSplitId,
          quickSplit: accessibleBy(input.userId),
        },
        select: { id: true, quickSplitId: true },
      }),
    ),
  );

  const findAccessibleExpenseDetail = Effect.fn(
    'QuickSplitStore.findAccessibleExpenseDetail',
  )((input: { quickSplitId: string; expenseId: string; userId: string }) =>
    database.use((db) =>
      db.quickSplitExpense.findFirst({
        where: {
          id: input.expenseId,
          quickSplitId: input.quickSplitId,
          quickSplit: accessibleBy(input.userId),
        },
        select: {
          id: true,
          quickSplitId: true,
          description: true,
          amount: true,
          currency: true,
          splitMethod: true,
          metadata: true,
          createdAt: true,
          paidByParticipant: {
            select: { id: true, userId: true, name: true, user: userImage },
          },
          quickSplit: {
            select: {
              name: true,
              participants: {
                select: {
                  id: true,
                  userId: true,
                  name: true,
                  role: true,
                  share: true,
                  user: userImage,
                },
              },
            },
          },
          settlements: {
            select: {
              id: true,
              fromParticipantId: true,
              toParticipantId: true,
              amount: true,
              currency: true,
              createdAt: true,
              fromParticipant: {
                select: { id: true, userId: true, name: true },
              },
              toParticipant: { select: { id: true, userId: true, name: true } },
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          },
        },
      }),
    ),
  );

  const listAccessibleExpenses = Effect.fn(
    'QuickSplitStore.listAccessibleExpenses',
  )(function* (input: {
    userId: string;
    limit: number;
    cursor: Cursor | undefined;
  }) {
    const where = { quickSplit: accessibleBy(input.userId) };
    const page = pageArgs({
      limit: input.limit,
      ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
    });
    const [total, rows] = yield* Effect.all([
      database.use((db) => db.quickSplitExpense.count({ where })),
      database.use((db) =>
        db.quickSplitExpense.findMany({
          where,
          ...page.args,
          select: {
            id: true,
            quickSplitId: true,
            description: true,
            amount: true,
            currency: true,
            createdAt: true,
            paidByParticipant: {
              select: { id: true, userId: true, name: true },
            },
            quickSplit: {
              select: {
                name: true,
                participants: {
                  select: {
                    id: true,
                    userId: true,
                    name: true,
                    share: true,
                    user: userImage,
                  },
                  orderBy: [{ id: 'asc' }],
                },
                _count: { select: { participants: true } },
              },
            },
            settlements: {
              select: {
                fromParticipantId: true,
                toParticipantId: true,
                amount: true,
                currency: true,
              },
            },
          },
        }),
      ),
    ]);
    return { total, rows };
  });

  const createExpense = Effect.fn('QuickSplitStore.createExpense')(
    (input: ExpenseWrite & { id: string | undefined; quickSplitId: string }) =>
      database.transaction(async (tx) => {
        const created = await tx.quickSplitExpense.create({
          data: {
            ...(input.id ? { id: input.id } : {}),
            quickSplitId: input.quickSplitId,
            paidByParticipantId: input.paidByParticipantId,
            description: input.description,
            amount: input.amount,
            currency: input.currency,
            splitMethod: input.splitMethod,
            ...(input.metadata ? { metadata: input.metadata } : {}),
            createdAt: input.at,
            updatedAt: input.at,
          },
          select: { id: true },
        });
        await Promise.all(
          Object.entries(input.shares).map(([participantId, share]) =>
            tx.quickSplitParticipant.update({
              where: { id: participantId },
              data: { share },
            }),
          ),
        );
        await tx.quickSplit.update({
          where: { id: input.quickSplitId },
          data: { updatedAt: input.at },
        });
        return tx.quickSplitExpense.findUniqueOrThrow({
          where: { id: created.id },
          select: expenseWithShares,
        });
      }),
  );

  const updateExpense = Effect.fn('QuickSplitStore.updateExpense')(
    (input: ExpenseWrite & { expenseId: string; quickSplitId: string }) =>
      database.transaction(async (tx) => {
        await tx.quickSplitExpense.update({
          where: { id: input.expenseId },
          data: {
            paidByParticipantId: input.paidByParticipantId,
            description: input.description,
            amount: input.amount,
            currency: input.currency,
            splitMethod: input.splitMethod,
            ...(input.metadata ? { metadata: input.metadata } : {}),
            updatedAt: input.at,
          },
          select: { id: true },
        });
        await Promise.all(
          Object.entries(input.shares).map(([participantId, share]) =>
            tx.quickSplitParticipant.update({
              where: { id: participantId },
              data: { share },
            }),
          ),
        );
        await tx.quickSplit.update({
          where: { id: input.quickSplitId },
          data: { updatedAt: input.at },
        });
        return tx.quickSplitExpense.findUniqueOrThrow({
          where: { id: input.expenseId },
          select: expenseWithShares,
        });
      }),
  );

  const createSettlement = Effect.fn('QuickSplitStore.createSettlement')(
    (input: {
      expenseId: string;
      quickSplitId: string;
      fromParticipantId: string;
      toParticipantId: string;
      amount: number;
      currency: string;
      at: Date;
    }) =>
      database.transaction(async (tx) => {
        const settlement = await tx.quickSplitExpenseSettlement.create({
          data: {
            expenseId: input.expenseId,
            fromParticipantId: input.fromParticipantId,
            toParticipantId: input.toParticipantId,
            amount: input.amount,
            currency: input.currency,
            createdAt: input.at,
          },
          select: { id: true, expenseId: true, amount: true, currency: true },
        });
        await tx.quickSplitExpense.update({
          where: { id: input.expenseId },
          data: { updatedAt: input.at },
        });
        await tx.quickSplit.update({
          where: { id: input.quickSplitId },
          data: { updatedAt: input.at },
        });
        return settlement;
      }),
  );

  const deleteExpense = Effect.fn('QuickSplitStore.deleteExpense')(
    (expenseId: string) =>
      database.transaction(async (tx) => {
        const deleted = await tx.quickSplitExpense.delete({
          where: { id: expenseId },
          select: { id: true, quickSplitId: true },
        });
        await tx.quickSplit.update({
          where: { id: deleted.quickSplitId },
          data: { updatedAt: new Date() },
        });
        return deleted;
      }),
  );

  return {
    findUsersByIds,
    findUserName,
    create,
    findAccessibleQuickSplit,
    findExpenseById,
    findAccessibleExpense,
    findAccessibleExpenseDetail,
    listAccessibleExpenses,
    createExpense,
    updateExpense,
    createSettlement,
    deleteExpense,
  };
});

export class QuickSplitStore extends Context.Service<
  QuickSplitStore,
  Effect.Success<typeof make>
>()('vornway/quick-splits/QuickSplitStore') {
  static readonly layer = Layer.effect(QuickSplitStore, make);
}
