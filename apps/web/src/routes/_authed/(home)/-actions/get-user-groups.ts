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
  currentUserBalances: Record<string, number>;
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

      const groupsResult = await db.group.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          ownerId: true,
          GroupMember: {
            select: {
              id: true,
              userId: true,
            },
          },
          Expense: {
            select: {
              amount: true,
              currency: true,
              notes: true,
              paidBy: {
                select: {
                  id: true,
                },
              },
              participants: {
                select: {
                  memberId: true,
                  share: true,
                },
              },
            },
          },
        },
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

      const groups: Group[] = groupsResult.map((group) => {
        const currentMemberId = group.GroupMember.find(
          (member) => member.userId === userId,
        )?.id;

        const currentUserBalances: Record<string, number> = {};

        if (currentMemberId) {
          for (const expense of group.Expense) {
            const isDeleted = expense.notes?.includes('[DELETED]') ?? false;
            if (isDeleted) continue;

            let delta = 0;

            if (expense.paidBy.id === currentMemberId) {
              delta += expense.amount;
            }

            const participation = expense.participants.find(
              (participant) => participant.memberId === currentMemberId,
            );

            if (participation) {
              delta -= participation.share;
            }

            if (delta !== 0) {
              currentUserBalances[expense.currency] =
                (currentUserBalances[expense.currency] ?? 0) + delta;
            }
          }
        }

        return {
          id: group.id,
          name: group.name,
          type: group.type,
          description: group.description,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          ownerId: group.ownerId,
          currentUserBalances,
        };
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
