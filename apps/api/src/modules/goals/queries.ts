import type { Prisma } from '#/generated/prisma/client';

export const memberGoalWhere = (userId: string, goalId?: string) =>
  ({
    ...(goalId === undefined ? {} : { id: goalId }),
    deletedAt: null,
    group: {
      type: 'meta',
      OR: [{ ownerId: userId }, { GroupMember: { some: { userId } } }],
    },
  }) satisfies Prisma.GoalWhereInput;

export const adminGoalWhere = (userId: string, goalId: string) =>
  ({
    id: goalId,
    deletedAt: null,
    group: {
      type: 'meta',
      OR: [
        { ownerId: userId },
        { GroupMember: { some: { userId, role: 'admin' } } },
      ],
    },
  }) satisfies Prisma.GoalWhereInput;

export const listSelect = {
  id: true,
  title: true,
  description: true,
  goalType: true,
  emoji: true,
  coverImageUrl: true,
  themeColor: true,
  contributionMode: true,
  currency: true,
  targetAmount: true,
  installmentCount: true,
  installmentAmount: true,
  endDate: true,
  createdAt: true,
  group: {
    select: {
      id: true,
      name: true,
      _count: { select: { GroupMember: true } },
    },
  },
  contributions: { select: { amount: true } },
} satisfies Prisma.GoalSelect;
export type GoalListRow = Prisma.GoalGetPayload<{ select: typeof listSelect }>;

export const detailSelect = {
  id: true,
  title: true,
  description: true,
  goalType: true,
  emoji: true,
  coverImageUrl: true,
  themeColor: true,
  contributionMode: true,
  currency: true,
  targetAmount: true,
  startDate: true,
  endDate: true,
  installmentCount: true,
  installmentAmount: true,
  suggestedContributionAmount: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  group: {
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      inviteCode: true,
      createdAt: true,
      updatedAt: true,
      GroupMember: {
        orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          role: true,
          userId: true,
          user: { select: { email: true, image: true, updatedAt: true } },
        },
      },
    },
  },
  contributions: {
    orderBy: [{ contributedAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      amount: true,
      contributedAt: true,
      notes: true,
      member: {
        select: {
          id: true,
          name: true,
          userId: true,
          user: { select: { image: true, updatedAt: true } },
        },
      },
    },
  },
} satisfies Prisma.GoalSelect;
export type GoalDetailRow = Prisma.GoalGetPayload<{
  select: typeof detailSelect;
}>;
