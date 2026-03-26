/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const ImportedExpenseSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  paidById: z.string().min(1),
  participantIds: z.array(z.string()),
});

const CreateImportedExpensesInputSchema = z.object({
  groupId: z.string(),
  expenses: z.array(ImportedExpenseSchema).min(1).max(20),
});

interface CreateImportedExpensesResponse {
  success: boolean;
  createdCount?: number;
  error?: string;
}

export const createImportedExpenses = createServerFn({ method: 'POST' })
  .inputValidator(CreateImportedExpensesInputSchema)
  .handler(async ({ data }): Promise<CreateImportedExpensesResponse> => {
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

      const groupMembers = await db.groupMember.findMany({
        where: {
          groupId: data.groupId,
        },
        select: {
          id: true,
        },
      });

      const validMemberIds = new Set(groupMembers.map((member) => member.id));

      for (const expense of data.expenses) {
        if (!validMemberIds.has(expense.paidById)) {
          return {
            success: false,
            error: 'Uno de los pagadores no pertenece al grupo',
          };
        }

        if (
          expense.participantIds.some(
            (participantId) => !validMemberIds.has(participantId),
          )
        ) {
          return {
            success: false,
            error: 'Uno de los participantes seleccionados no pertenece al grupo',
          };
        }
      }

      const totalsByCurrency = new Map<string, number>();

      for (const expense of data.expenses) {
        totalsByCurrency.set(
          expense.currency,
          (totalsByCurrency.get(expense.currency) ?? 0) + expense.amount,
        );
      }

      await db.$transaction(async (tx) => {
        for (const expense of data.expenses) {
          const participantShares =
            expense.participantIds.length > 0
              ? Object.fromEntries(
                  expense.participantIds.map((memberId) => [
                    memberId,
                    expense.amount / expense.participantIds.length,
                  ]),
                )
              : {};

          const createdExpense = await tx.expense.create({
            data: {
              groupId: data.groupId,
              paidById: expense.paidById,
              description: expense.description,
              amount: expense.amount,
              currency: expense.currency,
              ...(expense.participantIds.length > 0 && {
                participants: {
                  create: expense.participantIds.map((memberId) => ({
                    memberId,
                    share: participantShares[memberId],
                  })),
                },
              }),
            },
          });

          await tx.activityLog.create({
            data: {
              groupId: data.groupId,
              actorUserId: userId,
              actorName: membership.name,
              action: 'expense.created',
              targetName: expense.description,
              details: {
                expenseId: createdExpense.id,
                amount: expense.amount,
                currency: expense.currency,
                paidById: expense.paidById,
                participants: expense.participantIds.length,
                source: 'image-import',
              },
            },
          });
        }

        const group = await tx.group.findUnique({
          where: { id: data.groupId },
          select: { totals: true },
        });

        const currentTotals = (group?.totals as Record<string, number>) ?? {};
        const nextTotals = { ...currentTotals };

        for (const [currency, amount] of totalsByCurrency.entries()) {
          nextTotals[currency] = (nextTotals[currency] ?? 0) + amount;
        }

        await tx.group.update({
          where: { id: data.groupId },
          data: { totals: nextTotals },
        });
      });

      return {
        success: true,
        createdCount: data.expenses.length,
      };
    } catch (error) {
      console.error('Error creating imported expenses:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron crear los gastos importados',
      };
    }
  });
