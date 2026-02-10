/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const DeleteGoalInputSchema = z.object({
  groupId: z.string(),
  goalId: z.string(),
});

interface DeleteGoalResponse {
  success: boolean;
  error?: string;
}

export const deleteGoal = createServerFn({ method: 'POST' })
  .inputValidator(DeleteGoalInputSchema)
  .handler(async ({ data }): Promise<DeleteGoalResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const membership = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!membership) {
        return {
          success: false,
          error: 'No tienes acceso a esta meta',
        };
      }

      const goal = await db.goal.findFirst({
        where: {
          id: data.goalId,
          groupId: data.groupId,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          createdByMemberId: true,
        },
      });

      if (!goal) {
        return {
          success: false,
          error: 'Objetivo no encontrado',
        };
      }

      if (goal.createdByMemberId !== membership.id) {
        return {
          success: false,
          error: 'Solo quien creó el objetivo puede eliminarlo',
        };
      }

      await db.$transaction(async (tx) => {
        await tx.goal.update({
          where: {
            id: goal.id,
          },
          data: {
            deletedAt: new Date(),
          },
        });

        await tx.activityLog.create({
          data: {
            groupId: data.groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'goal.deleted',
            targetName: goal.title,
            details: {
              goalId: goal.id,
            },
          },
        });
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting goal:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'No se pudo eliminar el objetivo',
      };
    }
  });
