/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

interface GoalSummary {
  id: string;
  name: string;
  currency: string;
  targetAmount: number;
  totalContributed: number;
  progressPct: number;
  endDate: Date;
}

interface GetUserGoalsResponse {
  success: boolean;
  goals: GoalSummary[];
  error?: string;
}

export const getUserGoals = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GetUserGoalsResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          goals: [],
          error: 'No autenticado',
        };
      }

      const goalGroups = await db.group.findMany({
        where: {
          type: 'meta',
          OR: [
            { ownerId: userId },
            {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          Goal: {
            where: { deletedAt: null },
            select: {
              currency: true,
              targetAmount: true,
              endDate: true,
              contributions: {
                select: {
                  amount: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const goals = goalGroups
        .map((group) => {
          const primaryGoal = group.Goal[0];
          if (!primaryGoal) return null;

          const totalContributed = primaryGoal.contributions.reduce(
            (sum, item) => sum + item.amount,
            0,
          );
          const progressPct =
            primaryGoal.targetAmount > 0
              ? Math.min(100, (totalContributed / primaryGoal.targetAmount) * 100)
              : 0;

          return {
            id: group.id,
            name: group.name,
            currency: primaryGoal.currency,
            targetAmount: primaryGoal.targetAmount,
            totalContributed,
            progressPct,
            endDate: primaryGoal.endDate,
          };
        })
        .filter((item): item is GoalSummary => item !== null);

      return {
        success: true,
        goals,
      };
    } catch (error) {
      console.error('Error loading user goals:', error);
      return {
        success: false,
        goals: [],
        error:
          error instanceof Error ? error.message : 'No se pudieron cargar las metas',
      };
    }
  },
);
