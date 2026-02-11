/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const SearchGoalUsersInputSchema = z.object({
  groupId: z.string(),
  query: z.string(),
});

interface SearchGoalUsersResponse {
  success: boolean;
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  error?: string;
}

export const searchGoalUsers = createServerFn({ method: 'POST' })
  .inputValidator(SearchGoalUsersInputSchema)
  .handler(async ({ data }): Promise<SearchGoalUsersResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          users: [],
          error: 'No autenticado',
        };
      }

      const actorMember = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: {
          role: true,
        },
      });

      if (!actorMember) {
        return {
          success: false,
          users: [],
          error: 'No tienes acceso a esta meta',
        };
      }

      if (actorMember.role !== 'admin') {
        return {
          success: false,
          users: [],
          error: 'Solo un admin puede buscar usuarios',
        };
      }

      const query = data.query.trim();
      if (query.length < 2) {
        return {
          success: true,
          users: [],
        };
      }

      const users = await db.user.findMany({
        where: {
          isAnonymous: {
            not: true,
          },
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
          groupMembers: {
            none: {
              groupId: data.groupId,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: 'asc',
        },
        take: 8,
      });

      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error('Error searching goal users:', error);
      return {
        success: false,
        users: [],
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron buscar usuarios',
      };
    }
  });
