/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const AddGoalContributionInputSchema = z.object({
  groupId: z.string(),
  goalId: z.string(),
  memberId: z.string(),
  amount: z.number().positive(),
  contributedAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});

interface AddGoalContributionResponse {
  success: boolean;
  contributionId?: string;
  error?: string;
}

export const addGoalContribution = createServerFn({ method: 'POST' })
  .inputValidator(AddGoalContributionInputSchema)
  .handler(async ({ data }): Promise<AddGoalContributionResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const currentMembership = await db.groupMember.findFirst({
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

      if (!currentMembership) {
        return {
          success: false,
          error: 'No tienes acceso a este grupo',
        };
      }

      if (currentMembership.role !== 'admin') {
        return {
          success: false,
          error: 'Solo un admin puede registrar aportes',
        };
      }

      const [goal, contributionMember] = await Promise.all([
        db.goal.findFirst({
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
        }),
        db.groupMember.findFirst({
          where: {
            id: data.memberId,
            groupId: data.groupId,
          },
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

      if (!goal) {
        return {
          success: false,
          error: 'Meta no encontrada',
        };
      }

      if (!contributionMember) {
        return {
          success: false,
          error: 'Participante inválido',
        };
      }

      const contribution = await db.goalContribution.create({
        data: {
          goalId: goal.id,
          memberId: contributionMember.id,
          amount: data.amount,
          contributedAt: data.contributedAt ?? new Date(),
          notes: data.notes?.trim() || null,
        },
        select: {
          id: true,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: currentMembership.name,
          action: 'goal.contribution.created',
          targetName: goal.title,
          details: {
            goalId: goal.id,
            contributionId: contribution.id,
            amount: data.amount,
            currency: goal.currency,
            memberId: contributionMember.id,
            memberName: contributionMember.name,
          },
        },
      });

      return {
        success: true,
        contributionId: contribution.id,
      };
    } catch (error) {
      console.error('Error adding goal contribution:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo registrar el aporte',
      };
    }
  });
