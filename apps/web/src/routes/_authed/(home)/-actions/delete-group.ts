/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const DeleteGroupInputSchema = z.object({
  groupId: z.string(),
  groupNameConfirm: z.string().min(1),
});

interface DeleteGroupResponse {
  success: boolean;
  error?: string;
}

export const deleteGroup = createServerFn({ method: 'POST' })
  .inputValidator(DeleteGroupInputSchema)
  .handler(async ({ data }): Promise<DeleteGroupResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const group = await db.group.findUnique({
        where: {
          id: data.groupId,
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      });

      if (!group) {
        return {
          success: false,
          error: 'Grupo no encontrado',
        };
      }

      if (group.ownerId !== userId) {
        return {
          success: false,
          error: 'Solo el creador puede eliminar el grupo',
        };
      }

      if (group.name !== data.groupNameConfirm.trim()) {
        return {
          success: false,
          error: 'El nombre escrito no coincide con el grupo',
        };
      }

      await db.$transaction(async (tx) => {
        await tx.expenseParticipant.deleteMany({
          where: {
            expense: {
              groupId: group.id,
            },
          },
        });

        await tx.expense.deleteMany({
          where: {
            groupId: group.id,
          },
        });

        await tx.activityLog.deleteMany({
          where: {
            groupId: group.id,
          },
        });

        await tx.groupMember.deleteMany({
          where: {
            groupId: group.id,
          },
        });

        await tx.group.delete({
          where: {
            id: group.id,
          },
        });
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting group:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el grupo',
      };
    }
  });
