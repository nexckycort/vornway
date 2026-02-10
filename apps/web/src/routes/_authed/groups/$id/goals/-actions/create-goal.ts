/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const CreateGoalInputSchema = z
  .object({
    groupId: z.string(),
    title: z.string().min(1),
    description: z.string().optional(),
    targetAmount: z.number().nonnegative().optional(),
    currency: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    installmentCount: z.number().int().min(1),
    installmentAmount: z.number().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La fecha fin debe ser mayor o igual a la fecha inicio',
        path: ['endDate'],
      });
    }
  });

interface CreateGoalResponse {
  success: boolean;
  goalId?: string;
  error?: string;
}

export const createGoal = createServerFn({ method: 'POST' })
  .inputValidator(CreateGoalInputSchema)
  .handler(async ({ data }): Promise<CreateGoalResponse> => {
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
          error: 'No tienes acceso a este grupo',
        };
      }

      const targetAmount = data.targetAmount ?? 0;
      const installmentAmount =
        data.installmentAmount && data.installmentAmount > 0
          ? data.installmentAmount
          : targetAmount > 0
            ? targetAmount / data.installmentCount
            : 0;

      const goal = await db.goal.create({
        data: {
          groupId: data.groupId,
          createdByMemberId: membership.id,
          title: data.title,
          description: data.description?.trim() || null,
          targetAmount,
          currency: data.currency,
          startDate: data.startDate,
          endDate: data.endDate,
          installmentCount: data.installmentCount,
          installmentAmount,
        },
        select: {
          id: true,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: membership.name,
          action: 'goal.created',
          targetName: data.title,
          details: {
            goalId: goal.id,
            targetAmount,
            currency: data.currency,
            installmentCount: data.installmentCount,
            installmentAmount,
            startDate: data.startDate,
            endDate: data.endDate,
          },
        },
      });

      return {
        success: true,
        goalId: goal.id,
      };
    } catch (error) {
      console.error('Error creating goal:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'No se pudo crear la meta',
      };
    }
  });
