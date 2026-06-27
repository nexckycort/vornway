import { db, type Tx } from '#/infrastructure/database/connection';

export const quickSplitsRepository = {
  findUsersByIds: (userIds: string[]) =>
    db.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
  create: (input: {
    id: string;
    ownerId: string;
    name: string;
    description: string | null;
    participantUserIds: string[];
    createdAt: Date;
  }) =>
    db.quickSplit.create({
      data: {
        id: input.id,
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        participants: {
          createMany: {
            data: [
              {
                userId: input.ownerId,
                role: 'owner',
                joinedAt: input.createdAt,
              },
              ...input.participantUserIds.map((participantUserId) => ({
                userId: participantUserId,
                role: 'participant',
                joinedAt: input.createdAt,
              })),
            ],
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    }),
  findAccessibleQuickSplit: (input: { quickSplitId: string; userId: string }) =>
    db.quickSplit.findFirst({
      where: {
        id: input.quickSplitId,
        participants: {
          some: {
            userId: input.userId,
          },
        },
      },
      select: {
        id: true,
        participants: {
          select: {
            userId: true,
          },
        },
      },
    }),
  findExpenseById: (expenseId: string) =>
    db.quickSplitExpense.findUnique({
      where: { id: expenseId },
      select: {
        id: true,
        quickSplitId: true,
        description: true,
        amount: true,
        currency: true,
        paidByUserId: true,
        splitMethod: true,
        createdAt: true,
        participants: {
          select: {
            userId: true,
            share: true,
          },
          orderBy: [{ userId: 'asc' }],
        },
      },
    }),
  findAccessibleExpenseDetail: (input: {
    quickSplitId: string;
    expenseId: string;
    userId: string;
  }) =>
    db.quickSplitExpense.findFirst({
      where: {
        id: input.expenseId,
        quickSplitId: input.quickSplitId,
        quickSplit: {
          participants: {
            some: {
              userId: input.userId,
            },
          },
        },
      },
      select: {
        id: true,
        quickSplitId: true,
        description: true,
        amount: true,
        currency: true,
        splitMethod: true,
        createdAt: true,
        paidBy: {
          select: {
            id: true,
            name: true,
            image: true,
            updatedAt: true,
          },
        },
        quickSplit: {
          select: {
            name: true,
            participants: {
              select: {
                userId: true,
                role: true,
                user: {
                  select: {
                    name: true,
                    image: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
        participants: {
          select: {
            userId: true,
            share: true,
          },
          orderBy: [{ userId: 'asc' }],
        },
      },
    }),
  findAccessibleExpense: (input: {
    quickSplitId: string;
    expenseId: string;
    userId: string;
  }) =>
    db.quickSplitExpense.findFirst({
      where: {
        id: input.expenseId,
        quickSplitId: input.quickSplitId,
        quickSplit: {
          participants: {
            some: {
              userId: input.userId,
            },
          },
        },
      },
      select: {
        id: true,
        quickSplitId: true,
      },
    }),
  deleteExpense: (tx: Tx, expenseId: string) =>
    tx.quickSplitExpense.delete({
      where: {
        id: expenseId,
      },
      select: {
        id: true,
        quickSplitId: true,
      },
    }),
  countAccessibleExpenses: (userId: string) =>
    db.quickSplitExpense.count({
      where: {
        quickSplit: {
          participants: {
            some: {
              userId,
            },
          },
        },
      },
    }),
  listAccessibleExpenses: (input: {
    userId: string;
    limit: number;
    cursor?: string;
  }) =>
    db.quickSplitExpense.findMany({
      where: {
        quickSplit: {
          participants: {
            some: {
              userId: input.userId,
            },
          },
        },
      },
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      take: input.limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        quickSplitId: true,
        description: true,
        amount: true,
        currency: true,
        createdAt: true,
        paidBy: {
          select: {
            id: true,
            name: true,
          },
        },
        quickSplit: {
          select: {
            name: true,
            _count: {
              select: {
                participants: true,
              },
            },
          },
        },
      },
    }),
  createExpense: (
    tx: Tx,
    input: {
      id?: string;
      quickSplitId: string;
      paidByUserId: string;
      description: string;
      amount: number;
      currency: string;
      splitMethod: 'equal' | 'percentage' | 'exact';
      shares: Record<string, number>;
      createdAt: Date;
    },
  ) =>
    tx.quickSplitExpense.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        quickSplitId: input.quickSplitId,
        paidByUserId: input.paidByUserId,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        splitMethod: input.splitMethod,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
        participants: {
          create: Object.entries(input.shares).map(([userId, share]) => ({
            userId,
            share,
          })),
        },
      },
      select: {
        id: true,
        quickSplitId: true,
        description: true,
        amount: true,
        currency: true,
        paidByUserId: true,
        splitMethod: true,
        createdAt: true,
        participants: {
          select: {
            userId: true,
            share: true,
          },
          orderBy: [{ userId: 'asc' }],
        },
      },
    }),
  updateExpense: (
    tx: Tx,
    input: {
      expenseId: string;
      paidByUserId: string;
      description: string;
      amount: number;
      currency: string;
      splitMethod: 'equal' | 'percentage' | 'exact';
      shares: Record<string, number>;
      updatedAt: Date;
    },
  ) =>
    tx.quickSplitExpense.update({
      where: {
        id: input.expenseId,
      },
      data: {
        paidByUserId: input.paidByUserId,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        splitMethod: input.splitMethod,
        updatedAt: input.updatedAt,
        participants: {
          deleteMany: {},
          create: Object.entries(input.shares).map(([userId, share]) => ({
            userId,
            share,
          })),
        },
      },
      select: {
        id: true,
        quickSplitId: true,
        description: true,
        amount: true,
        currency: true,
        paidByUserId: true,
        splitMethod: true,
        createdAt: true,
        participants: {
          select: {
            userId: true,
            share: true,
          },
          orderBy: [{ userId: 'asc' }],
        },
      },
    }),
};
