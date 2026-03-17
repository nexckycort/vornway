/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const CreateExpenseCategoryInputSchema = z.object({
  groupId: z.string(),
  name: z.string().trim().min(1).max(40),
});

interface CreateExpenseCategoryResponse {
  success: boolean;
  categoryId?: string;
  error?: string;
}

export const createExpenseCategory = createServerFn({ method: 'POST' })
  .inputValidator(CreateExpenseCategoryInputSchema)
  .handler(async ({ data }): Promise<CreateExpenseCategoryResponse> => {
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

      const existingCategory = await db.expenseCategory.findFirst({
        where: {
          groupId: data.groupId,
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (existingCategory) {
        return {
          success: false,
          error: 'Ya existe una categoría con ese nombre',
        };
      }

      const category = await db.expenseCategory.create({
        data: {
          groupId: data.groupId,
          name: normalizedName,
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: membership.name,
          action: 'expense-category.created',
          targetName: normalizedName,
          details: {
            categoryId: category.id,
          },
        },
      });

      return {
        success: true,
        categoryId: category.id,
      };
    } catch (error) {
      console.error('Error creating expense category:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo crear la categoría',
      };
    }
  });
