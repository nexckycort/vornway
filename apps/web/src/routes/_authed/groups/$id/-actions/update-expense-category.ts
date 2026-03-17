/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const UpdateExpenseCategoryInputSchema = z.object({
  groupId: z.string(),
  categoryId: z.string(),
  name: z.string().trim().min(1).max(40),
});

interface UpdateExpenseCategoryResponse {
  success: boolean;
  error?: string;
}

export const updateExpenseCategory = createServerFn({ method: 'POST' })
  .inputValidator(UpdateExpenseCategoryInputSchema)
  .handler(async ({ data }): Promise<UpdateExpenseCategoryResponse> => {
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

      const normalizedName = data.name.trim();

      const category = await db.expenseCategory.findFirst({
        where: {
          id: data.categoryId,
          groupId: data.groupId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!category) {
        return {
          success: false,
          error: 'La categoría no existe en este grupo',
        };
      }

      const duplicate = await db.expenseCategory.findFirst({
        where: {
          groupId: data.groupId,
          id: {
            not: data.categoryId,
          },
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        return {
          success: false,
          error: 'Ya existe una categoría con ese nombre',
        };
      }

      await db.expenseCategory.update({
        where: {
          id: data.categoryId,
        },
        data: {
          name: normalizedName,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: membership.name,
          action: 'expense-category.updated',
          targetName: normalizedName,
          details: {
            categoryId: data.categoryId,
            previousName: category.name,
          },
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error updating expense category:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la categoría',
      };
    }
  });
