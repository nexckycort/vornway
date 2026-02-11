/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const DeleteGoalContributionInputSchema = z.object({
  groupId: z.string(),
  contributionId: z.string(),
});

interface DeleteGoalContributionResponse {
  success: boolean;
  error?: string;
}

export const deleteGoalContribution = createServerFn({ method: 'POST' })
  .inputValidator(DeleteGoalContributionInputSchema)
  .handler(async ({ data }): Promise<DeleteGoalContributionResponse> => {
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
        },
      });

      if (!actorMember) {
        return { success: false, error: 'No tienes acceso a esta meta' };
      }

      if (actorMember.role !== 'admin') {
        return {
          success: false,
          error: 'Solo un admin puede eliminar aportes',
        };
      }

      const contribution = await db.goalContribution.findFirst({
        where: {
          id: data.contributionId,
          goal: {
            groupId: data.groupId,
            deletedAt: null,
          },
        },
        select: {
          id: true,
          amount: true,
          goal: {
            select: {
              id: true,
              title: true,
              currency: true,
            },
          },
          member: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!contribution) {
        return { success: false, error: 'Aporte no encontrado' };
      }

      await db.goalContribution.delete({
        where: {
          id: contribution.id,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: actorMember.name,
          action: 'goal.contribution.deleted',
          targetName: contribution.goal.title,
          details: {
            goalId: contribution.goal.id,
            contributionId: contribution.id,
            amount: contribution.amount,
            currency: contribution.goal.currency,
            memberId: contribution.member.id,
            memberName: contribution.member.name,
          },
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting goal contribution:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el aporte',
      };
    }
  });
