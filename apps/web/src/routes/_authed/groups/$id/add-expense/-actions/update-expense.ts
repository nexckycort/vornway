/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const UpdateExpenseInputSchema = z.object({
  groupId: z.string(),
  expenseId: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string(),
  paidById: z.string(),
  participantIds: z.array(z.string()),
  splitMethod: z.enum(['equal', 'percentage', 'exact']),
  exactShares: z.record(z.string(), z.number().nonnegative()).optional(),
});

interface UpdateExpenseResponse {
  success: boolean;
  expenseId?: string;
  error?: string;
}

export const updateExpense = createServerFn({ method: 'POST' })
  .inputValidator(UpdateExpenseInputSchema)
  .handler(async ({ data }): Promise<UpdateExpenseResponse> => {
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
      });

      if (!membership) {
        return {
          success: false,
          error: 'No tienes acceso a este grupo',
        };
      }

      let participantShares: Record<string, number> = {};

      if (data.participantIds.length > 0) {
        if (data.splitMethod === 'exact') {
          const exactShares = data.exactShares ?? {};
          participantShares = Object.fromEntries(
            data.participantIds.map((memberId) => [
              memberId,
              exactShares[memberId] ?? 0,
            ]),
          );

          const exactTotal = Object.values(participantShares).reduce(
            (sum, share) => sum + share,
            0,
          );

          if (Math.abs(exactTotal - data.amount) >= 0.01) {
            return {
              success: false,
              error: 'La suma de montos exactos debe ser igual al monto total',
            };
          }
        } else {
          const equalShare = data.amount / data.participantIds.length;
          participantShares = Object.fromEntries(
            data.participantIds.map((memberId) => [memberId, equalShare]),
          );
        }
      }

      const result = await db.$transaction(async (tx) => {
        const existingExpense = await tx.expense.findFirst({
          where: {
            id: data.expenseId,
            groupId: data.groupId,
          },
          select: {
            id: true,
            amount: true,
            currency: true,
            notes: true,
          },
        });

        if (!existingExpense) {
          throw new Error('Gasto no encontrado');
        }

        if (existingExpense.notes?.includes('[DELETED]')) {
          throw new Error('No puedes editar un gasto eliminado');
        }

        await tx.expense.update({
          where: {
            id: existingExpense.id,
          },
          data: {
            description: data.description,
            amount: data.amount,
            currency: data.currency,
            paidById: data.paidById,
          },
        });

        await tx.expenseParticipant.deleteMany({
          where: {
            expenseId: existingExpense.id,
          },
        });

        if (data.participantIds.length > 0) {
          await tx.expenseParticipant.createMany({
            data: data.participantIds.map((memberId) => ({
              expenseId: existingExpense.id,
              memberId,
              share: participantShares[memberId],
            })),
          });
        }

        const group = await tx.group.findUnique({
          where: {
            id: data.groupId,
          },
          select: {
            totals: true,
          },
        });

        const currentTotals = (group?.totals as Record<string, number>) ?? {};
        const prevCurrencyTotal =
          (currentTotals[existingExpense.currency] ?? 0) -
          existingExpense.amount;

        const nextTotals: Record<string, number> = {
          ...currentTotals,
          [existingExpense.currency]: Math.max(0, prevCurrencyTotal),
        };

        if (nextTotals[existingExpense.currency] === 0) {
          delete nextTotals[existingExpense.currency];
        }

        nextTotals[data.currency] =
          (nextTotals[data.currency] ?? 0) + data.amount;

        await tx.group.update({
          where: {
            id: data.groupId,
          },
          data: {
            totals: nextTotals,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId: data.groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'expense.updated',
            targetName: data.description,
            details: {
              expenseId: existingExpense.id,
              amount: data.amount,
              currency: data.currency,
              previousAmount: existingExpense.amount,
              previousCurrency: existingExpense.currency,
            },
          },
        });

        return {
          expenseId: existingExpense.id,
          previousAmount: existingExpense.amount,
          previousCurrency: existingExpense.currency,
        };
      });

      return {
        success: true,
        expenseId: result.expenseId,
      };
    } catch (error) {
      console.error('Error updating expense:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al actualizar el gasto',
      };
    }
  });
