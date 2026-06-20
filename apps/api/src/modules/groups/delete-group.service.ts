import { db } from '#/infrastructure/database/connection';
import { deleteGroupImage } from './group-image.service';
import type { GroupDeleteResult } from './types';

export function createGroupDeleteService() {
  return {
    deleteGroup: async ({
      userId,
      groupId,
    }: {
      userId: string;
      groupId: string;
    }): Promise<GroupDeleteResult> => {
      const group = await db.group.findFirst({
        where: {
          id: groupId,
          ownerId: userId,
        },
        select: {
          id: true,
          imageUrl: true,
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const expenses = await db.expense.findMany({
        where: { groupId },
        select: { id: true },
      });
      const expenseIds = expenses.map((expense) => expense.id);

      await db.$transaction(async (tx) => {
        if (expenseIds.length > 0) {
          await tx.expenseParticipant.deleteMany({
            where: {
              expenseId: {
                in: expenseIds,
              },
            },
          });
        }

        await tx.expense.deleteMany({
          where: {
            groupId,
          },
        });

        await tx.goal.deleteMany({
          where: {
            groupId,
          },
        });

        await tx.expenseCategory.deleteMany({
          where: {
            groupId,
          },
        });

        await tx.groupMember.deleteMany({
          where: {
            groupId,
          },
        });

        await tx.group.delete({
          where: {
            id: groupId,
          },
        });
      });

      if (group.imageUrl) {
        await deleteGroupImage(group.imageUrl).catch(() => undefined);
      }

      return {
        id: group.id,
      };
    },
  };
}
