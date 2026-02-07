/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const DeleteExpenseInputSchema = z.object({
  groupId: z.string(),
  expenseId: z.string(),
});

interface DeleteExpenseResponse {
  success: boolean;
  error?: string;
}

export const deleteExpense = createServerFn({ method: 'POST' })
  .inputValidator(DeleteExpenseInputSchema)
  .handler(async ({ data }): Promise<DeleteExpenseResponse> => {
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

      await db.$transaction(async (tx) => {
        const expense = await tx.expense.findFirst({
          where: {
            id: data.expenseId,
            groupId: data.groupId,
          },
          select: {
            id: true,
            description: true,
            amount: true,
            currency: true,
            notes: true,
          },
        });

        if (!expense) {
          throw new Error('Gasto no encontrado');
        }

        if (expense.notes?.includes('[DELETED]')) {
          throw new Error('Este gasto ya fue eliminado');
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
        const currentCurrencyTotal = currentTotals[expense.currency] ?? 0;
        const nextCurrencyTotal = currentCurrencyTotal - expense.amount;
        const nextTotals = {
          ...currentTotals,
          [expense.currency]: Math.max(0, nextCurrencyTotal),
        };

        if (nextTotals[expense.currency] === 0) {
          delete nextTotals[expense.currency];
        }

        await tx.expenseParticipant.deleteMany({
          where: {
            expenseId: expense.id,
          },
        });

        const deleteNote = `[DELETED] ${new Date().toISOString()} by ${membership.id}`;
        const nextNotes = expense.notes
          ? `${expense.notes}\n${deleteNote}`
          : deleteNote;

        await tx.expense.update({
          where: {
            id: expense.id,
          },
          data: {
            amount: 0,
            description: `${expense.description} (eliminado)`,
            notes: nextNotes,
          },
        });

        await tx.group.update({
          where: {
            id: data.groupId,
          },
          data: {
            totals: nextTotals,
          },
        });
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting expense:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar el gasto',
      };
    }
  });
