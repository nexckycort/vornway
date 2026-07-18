import { db } from '#/infrastructure/database/connection';
import { deleteGroupImage } from '#/infrastructure/storage/group-images';
import { groupErrors } from './groups.errors';
import type { GroupDeleteResult } from './types';

export function createGroupDeleteOperations() {
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
        throw groupErrors.notFound();
      }

      await db.$transaction(async (tx) => {
        await tx.expenseParticipant.deleteMany({
          where: {
            expense: {
              groupId,
            },
          },
        });

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
