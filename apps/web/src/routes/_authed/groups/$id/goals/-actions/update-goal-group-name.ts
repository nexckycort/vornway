/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const UpdateGoalGroupNameInputSchema = z.object({
  groupId: z.string(),
  name: z.string().min(1),
});

interface UpdateGoalGroupNameResponse {
  success: boolean;
  error?: string;
}

export const updateGoalGroupName = createServerFn({ method: 'POST' })
  .inputValidator(UpdateGoalGroupNameInputSchema)
  .handler(async ({ data }): Promise<UpdateGoalGroupNameResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return { success: false, error: 'No autenticado' };
      }

      const actorMember = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: {
          id: true,
          name: true,
          role: true,
          group: {
            select: {
              type: true,
            },
          },
        },
      });

      if (!actorMember) {
        return { success: false, error: 'No tienes acceso a esta meta' };
      }

      if (actorMember.group.type !== 'meta') {
        return { success: false, error: 'Solo puedes editar grupos tipo meta' };
      }

      if (actorMember.role !== 'admin') {
        return {
          success: false,
          error: 'Solo un admin puede editar el nombre de la meta',
        };
      }

      const nextName = data.name.trim();
      if (!nextName) {
        return {
          success: false,
          error: 'El nombre no puede estar vacío',
        };
      }

      await db.group.update({
        where: {
          id: data.groupId,
        },
        data: {
          name: nextName,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'goal.group.updated',
          targetName: nextName,
          details: {
            groupId: data.groupId,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating goal group name:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo editar el nombre de la meta',
      };
    }
  });
