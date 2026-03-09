/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';
import { Prisma } from '~/generated/prisma/client';

import { db } from '~/infrastructure/database/connection';
import { buildExpenseMetadata, parseExpenseMetadata } from '~/lib/expense-metadata';
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
            notes: true,
            metadata: true,
          },
        });

        if (!expense) {
          throw new Error('Gasto no encontrado');
        }

        if (expense.notes?.includes('[DELETED]')) {
          throw new Error('No puedes fijar un gasto eliminado');
        }

        const currentMetadata = parseExpenseMetadata(expense.metadata);
        const nextPinnedAt = currentMetadata.pinnedAt
          ? null
          : new Date().toISOString();

        if (nextPinnedAt) {
          const allExpenses = await tx.expense.findMany({
            where: {
              groupId: data.groupId,
            },
            select: {
              id: true,
              notes: true,
              metadata: true,
            },
          });

          const pinnedCount = allExpenses.filter((item) => {
            if (item.id === expense.id) return false;
            if (item.notes?.includes('[DELETED]')) return false;
            return Boolean(parseExpenseMetadata(item.metadata).pinnedAt);
          }).length;

          if (pinnedCount >= 3) {
            throw new Error('Solo puedes fijar hasta 3 gastos');
          }
        }

        const nextMetadata = buildExpenseMetadata({
          items:
            currentMetadata.expenseType === 'composite'
              ? currentMetadata.items
              : [],
          pinnedAt: nextPinnedAt,
        });

        await tx.expense.update({
          where: {
            id: expense.id,
          },
          data: {
            metadata: (nextMetadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
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
