/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const UpdateGoalSettingsInputSchema = z.object({
  groupId: z.string(),
  goalId: z.string(),
  targetAmount: z.number().positive(),
  installmentAmount: z.number().positive(),
});

interface UpdateGoalSettingsResponse {
  success: boolean;
  error?: string;
}

export const updateGoalSettings = createServerFn({ method: 'POST' })
  .inputValidator(UpdateGoalSettingsInputSchema)
  .handler(async ({ data }): Promise<UpdateGoalSettingsResponse> => {
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
        return {
          success: false,
          error: 'Solo puedes editar metas tipo objetivo',
        };
      }

      if (actorMember.role !== 'admin') {
        return {
          success: false,
          error: 'Solo un admin puede editar la meta y cuota mensual',
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
          currency: true,
        },
      });

      if (!goal) {
        return { success: false, error: 'Objetivo no encontrado' };
      }

      await db.goal.update({
        where: {
          id: goal.id,
        },
        data: {
          targetAmount: data.targetAmount,
          installmentAmount: data.installmentAmount,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'goal.updated',
          targetName: goal.title,
          details: {
            goalId: goal.id,
            targetAmount: data.targetAmount,
            installmentAmount: data.installmentAmount,
            currency: goal.currency,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating goal settings:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'No se pudo editar la meta',
      };
    }
  });
