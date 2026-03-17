/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const DeleteExpenseCategoryInputSchema = z.object({
  groupId: z.string(),
  categoryId: z.string(),
});

interface DeleteExpenseCategoryResponse {
  success: boolean;
  error?: string;
}

export const deleteExpenseCategory = createServerFn({ method: 'POST' })
  .inputValidator(DeleteExpenseCategoryInputSchema)
  .handler(async ({ data }): Promise<DeleteExpenseCategoryResponse> => {
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

      const category = await db.expenseCategory.findFirst({
        where: {
          id: data.categoryId,
          groupId: data.groupId,
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              expenses: true,
            },
          },
        },
      });

      if (!category) {
        return {
          success: false,
          error: 'La categoría no existe en este grupo',
        };
      }

      if (category._count.expenses > 0) {
        return {
          success: false,
          error: 'Solo puedes eliminar categorías sin gastos',
        };
      }

      await db.expenseCategory.delete({
        where: {
          id: data.categoryId,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: membership.name,
          action: 'expense-category.deleted',
          targetName: category.name,
          details: {
            categoryId: data.categoryId,
          },
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting expense category:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar la categoría',
      };
    }
  });
