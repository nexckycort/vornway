/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { isExpenseDeleted } from '~/lib/expense-state';
import { useAppSession } from '~/utils/session';

const ToggleExpensePinInputSchema = z.object({
  groupId: z.string(),
  expenseId: z.string(),
});

interface ToggleExpensePinResponse {
  success: boolean;
  isPinned?: boolean;
  error?: string;
}

export const toggleExpensePin = createServerFn({ method: 'POST' })
  .inputValidator(ToggleExpensePinInputSchema)
  .handler(async ({ data }): Promise<ToggleExpensePinResponse> => {
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

      const result = await db.$transaction(async (tx) => {
        const expense = await tx.expense.findFirst({
          where: {
            id: data.expenseId,
            groupId: data.groupId,
          },
          select: {
            id: true,
            description: true,
            status: true,
            pinnedAt: true,
          },
        });

        if (!expense) {
          throw new Error('Gasto no encontrado');
        }

        if (isExpenseDeleted(expense.status)) {
          throw new Error('No puedes fijar un gasto eliminado');
        }

        const nextPinnedAt = expense.pinnedAt
          ? null
          : new Date();

        if (nextPinnedAt) {
          const pinnedCount = await tx.expense.count({
            where: {
              groupId: data.groupId,
              status: 'ACTIVE',
              pinnedAt: {
                not: null,
              },
              id: {
                not: expense.id,
              },
            },
          });

          if (pinnedCount >= 3) {
            throw new Error('Solo puedes fijar hasta 3 gastos');
          }
        }

        await tx.expense.update({
          where: {
            id: expense.id,
          },
          data: {
            pinnedAt: nextPinnedAt,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId: data.groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: nextPinnedAt ? 'expense.pinned' : 'expense.unpinned',
            targetName: expense.description,
            details: {
              expenseId: expense.id,
              pinnedAt: nextPinnedAt,
            },
          },
        });

        return {
          isPinned: Boolean(nextPinnedAt),
        };
      });

      return {
        success: true,
        isPinned: result.isPinned,
      };
    } catch (error) {
      console.error('Error toggling expense pin:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'No se pudo fijar el gasto',
      };
    }
  });
