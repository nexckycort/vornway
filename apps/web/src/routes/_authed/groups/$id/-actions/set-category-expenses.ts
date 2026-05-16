/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const SetCategoryExpensesInputSchema = z.object({
  groupId: z.string(),
  categoryId: z.string(),
  expenseIds: z.array(z.string()).max(200),
});

interface SetCategoryExpensesResponse {
  success: boolean;
  updatedCount?: number;
  error?: string;
}

export const setCategoryExpenses = createServerFn({ method: 'POST' })
  .inputValidator(SetCategoryExpensesInputSchema)
  .handler(async ({ data }): Promise<SetCategoryExpensesResponse> => {
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
        },
      });

      if (!category) {
        return {
          success: false,
          error: 'La categoría no existe en este grupo',
        };
      }

      if (data.expenseIds.length > 0) {
        const validExpenses = await db.expense.findMany({
          where: {
            id: { in: data.expenseIds },
            groupId: data.groupId,
            OR: [
              { categoryId: null },
              { categoryId: data.categoryId },
            ],
            expenseType: {
              not: 'SETTLEMENT',
            },
            status: 'ACTIVE',
          },
          select: {
            id: true,
          },
        });

        if (validExpenses.length !== data.expenseIds.length) {
          return {
            success: false,
            error:
              'Solo puedes asignar gastos sin categoría o que ya pertenezcan a esta categoría',
          };
        }
      }

      const updatedCount = await db.$transaction(async (tx) => {
        const removed = await tx.expense.updateMany({
          where: {
            groupId: data.groupId,
            categoryId: data.categoryId,
            expenseType: {
              not: 'SETTLEMENT',
            },
            status: 'ACTIVE',
            ...(data.expenseIds.length > 0 && {
              id: {
                notIn: data.expenseIds,
              },
            }),
          },
          data: {
            categoryId: null,
          },
        });

        const added =
          data.expenseIds.length > 0
            ? await tx.expense.updateMany({
                where: {
                  groupId: data.groupId,
                  id: {
                    in: data.expenseIds,
                  },
                  expenseType: {
                    not: 'SETTLEMENT',
                  },
                  status: 'ACTIVE',
                },
                data: {
                  categoryId: data.categoryId,
                },
              })
            : { count: 0 };

        await tx.activityLog.create({
          data: {
            groupId: data.groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'expense-category.assigned',
            targetName: category.name,
            details: {
              categoryId: category.id,
              expenseIds: data.expenseIds,
              assignedCount: added.count,
              removedCount: removed.count,
            },
          },
        });

        return added.count + removed.count;
      });

      return {
        success: true,
        updatedCount,
      };
    } catch (error) {
      console.error('Error setting category expenses:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron actualizar los gastos',
      };
    }
  });
