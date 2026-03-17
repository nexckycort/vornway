/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';
import { Prisma } from '~/generated/prisma/client';
import { db } from '~/infrastructure/database/connection';
import {
  buildExpenseMetadata,
  sumCompositeExpenseItems,
} from '~/lib/expense-metadata';
import { useAppSession } from '~/utils/session';

const CompositeExpenseItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().nonnegative(),
  createdAt: z.string().min(1),
});

const CreateExpenseInputSchema = z.object({
  groupId: z.string(),
  categoryId: z.string().optional(),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string(),
  paidById: z.string(), // GroupMember ID
  participantIds: z.array(z.string()), // GroupMember IDs (vacío = gasto personal)
  expenseType: z.enum(['standard', 'composite']).default('standard'),
  compositeItems: z.array(CompositeExpenseItemSchema).optional(),
  splitMethod: z.enum(['equal', 'percentage', 'exact']),
  exactShares: z.record(z.string(), z.number().nonnegative()).optional(),
});

interface CreateExpenseResponse {
  success: boolean;
  expenseId?: string;
  error?: string;
}

export const createExpense = createServerFn({ method: 'POST' })
  .inputValidator(CreateExpenseInputSchema)
  .handler(async ({ data }): Promise<CreateExpenseResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      // Verificar que el usuario es miembro del grupo
      const userMembership = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId: userId,
        },
      });

      if (!userMembership) {
        return {
          success: false,
          error: 'No eres miembro de este grupo',
        };
      }

      if (data.categoryId) {
        const category = await db.expenseCategory.findFirst({
          where: {
            id: data.categoryId,
            groupId: data.groupId,
          },
          select: { id: true },
        });

        if (!category) {
          return {
            success: false,
            error: 'La categoría no existe en este grupo',
          };
        }
      }

      const isComposite = data.expenseType === 'composite';
      const compositeItems = isComposite ? (data.compositeItems ?? []) : [];
      const computedAmount = isComposite
        ? sumCompositeExpenseItems(compositeItems)
        : data.amount;

      if (isComposite && compositeItems.length === 0) {
        return {
          success: false,
          error: 'Debes agregar al menos un subgasto',
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

          if (Math.abs(exactTotal - computedAmount) >= 0.01) {
            return {
              success: false,
              error: 'La suma de montos exactos debe ser igual al monto total',
            };
          }
        } else {
          const equalShare = computedAmount / data.participantIds.length;
          participantShares = Object.fromEntries(
            data.participantIds.map((memberId) => [memberId, equalShare]),
          );
        }
      }

      const expense = await db.expense.create({
        data: {
          groupId: data.groupId,
          paidById: data.paidById,
          categoryId: data.categoryId,
          description: data.description,
          amount: computedAmount,
          currency: data.currency,
          metadata: isComposite
            ? (buildExpenseMetadata({
                items: compositeItems,
              }) as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          // Solo crear participantes si hay seleccionados (no es gasto personal)
          ...(data.participantIds.length > 0 && {
            participants: {
              create: data.participantIds.map((memberId) => ({
                memberId,
                share: participantShares[memberId],
              })),
            },
          }),
        },
      });

      await db.activityLog.create({
        data: {
          groupId: data.groupId,
          actorUserId: userId,
          actorName: userMembership.name,
          action: 'expense.created',
          targetName: data.description,
          details: {
            expenseId: expense.id,
            amount: computedAmount,
            currency: data.currency,
            paidById: data.paidById,
            categoryId: data.categoryId ?? null,
            participants: data.participantIds.length,
            expenseType: data.expenseType,
            subExpenseCount: compositeItems.length,
          },
        },
      });

      // Actualizar el caché de totales del grupo
      const group = await db.group.findUnique({
        where: { id: data.groupId },
        select: { totals: true },
      });

      const currentTotals = (group?.totals as Record<string, number>) ?? {};
      const newTotals = {
        ...currentTotals,
        [data.currency]: (currentTotals[data.currency] ?? 0) + computedAmount,
      };

      await db.group.update({
        where: { id: data.groupId },
        data: { totals: newTotals },
      });

      return {
        success: true,
        expenseId: expense.id,
      };
    } catch (error) {
      console.error('Error creating expense:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Error al crear el gasto',
      };
    }
  });
