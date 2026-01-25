import { createServerFn } from '@tanstack/react-start';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

interface Group {
  id: string;
  name: string;
  type: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

interface GetUserGroupsResponse {
  success: boolean;
  groups: Group[];
  error?: string;
}

export const getUserGroups = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GetUserGroupsResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          groups: [],
          error: 'No autenticado',
        };
      }

      const groups = await db.group.findMany({
        where: {
          OR: [
            { ownerId: userId },
            {
              GroupMember: {
                some: {
                  userId: userId,
                },
              },
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        success: true,
        groups,
      };
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return {
        success: false,
        groups: [],
        error:
          error instanceof Error ? error.message : 'Error al obtener los grupos',
      };
    }
  },
);
