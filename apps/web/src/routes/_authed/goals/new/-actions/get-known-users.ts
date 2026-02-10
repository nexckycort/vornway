/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

interface KnownUser {
  id: string;
  name: string;
}

interface GetKnownUsersResponse {
  success: boolean;
  users: KnownUser[];
  error?: string;
}

export const getKnownUsers = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GetKnownUsersResponse> => {
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
          users: [],
        };
      }

      const groupIds = memberships.map((membership) => membership.groupId);

      const relatedMembers = await db.groupMember.findMany({
        where: {
          groupId: {
            in: groupIds,
          },
          userId: {
            not: null,
          },
          NOT: {
            userId,
          },
        },
        select: {
          userId: true,
          name: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      const usersById = new Map<string, KnownUser>();

      for (const member of relatedMembers) {
        if (!member.userId) continue;

        if (!usersById.has(member.userId)) {
          usersById.set(member.userId, {
            id: member.userId,
            name: member.user?.name ?? member.name,
          });
        }
      }

      const users = Array.from(usersById.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
      );

      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error('Error loading known users:', error);
      return {
        success: false,
        users: [],
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los usuarios',
      };
    }
  },
);
