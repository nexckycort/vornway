/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

interface ActivityItem {
  id: string;
  action: string;
  actorName: string;
  targetName: string | null;
  createdAt: Date;
  group: {
    id: string;
    name: string;
  };
  details: unknown;
}

interface GetActivityFeedResponse {
  success: boolean;
  activities: ActivityItem[];
  error?: string;
}

export const getActivityFeed = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GetActivityFeedResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          activities: [],
          error: 'No autenticado',
        };
      }

      const memberships = await db.groupMember.findMany({
        where: {
          userId,
        },
        select: {
          groupId: true,
        },
      });

      if (memberships.length === 0) {
        return {
          success: true,
          activities: [],
        };
      }

      const activities = await db.activityLog.findMany({
        where: {
          groupId: {
            in: memberships.map((membership) => membership.groupId),
          },
        },
        select: {
          id: true,
          action: true,
          actorName: true,
          targetName: true,
          createdAt: true,
          details: true,
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 200,
      });

      return {
        success: true,
        activities,
      };
    } catch (error) {
      console.error('Error loading activity feed:', error);
      return {
        success: false,
        activities: [],
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la actividad',
      };
    }
  },
);
