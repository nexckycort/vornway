import { db } from '~/infrastructure/database/connection';

import type { GoalListItem, GoalsListResponse } from './types';

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

function summarizeGoal(goal: {
  id: string;
  title: string;
  description: string | null;
  currency: string;
  targetAmount: number;
  endDate: Date;
  createdAt: Date;
  group: {
    id: string;
    name: string;
  };
  contributions: Array<{ amount: number }>;
}): GoalListItem {
  const savedAmount = normalizeAmount(
    goal.contributions.reduce((total, contribution) => total + contribution.amount, 0),
  );
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, normalizeAmount((savedAmount / goal.targetAmount) * 100))
      : 0;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress,
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    group: goal.group,
  };
}

export type GoalsListQuery = {
  limit: number;
  cursor?: string;
};

export type GoalsService = {
  list: (userId: string, query: GoalsListQuery) => Promise<GoalsListResponse>;
};

export function createGoalsService(): GoalsService {
  return {
    list: async (userId, query) => {
      const where = {
        deletedAt: null,
        group: {
          type: 'meta' as const,
          OR: [
            {
              ownerId: userId,
            },
            {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
      };

      const [total, rows] = await Promise.all([
        db.goal.count({ where }),
        db.goal.findMany({
          where,
          ...(query.cursor
            ? {
                cursor: {
                  id: query.cursor,
                },
                skip: 1,
              }
            : {}),
          take: query.limit + 1,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            title: true,
            description: true,
            currency: true,
            targetAmount: true,
            endDate: true,
            createdAt: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
            contributions: {
              select: {
                amount: true,
              },
            },
          },
        }),
      ]);

      const hasNextPage = rows.length > query.limit;
      const data = rows.slice(0, query.limit).map(summarizeGoal);

      return {
        data,
        pagination: {
          limit: query.limit,
          total,
          nextCursor: hasNextPage ? data[data.length - 1]?.id ?? null : null,
        },
      };
    },
  };
}
