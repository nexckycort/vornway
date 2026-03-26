/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const SettleDebtInputSchema = z.object({
  groupId: z.string(),
  fromMemberId: z.string(),
  toMemberId: z.string(),
  amount: z.number().positive(),
  currency: z.string().min(1),
  method: z.enum(['cards', 'flex']).optional(),
});

interface SettleDebtResponse {
  success: boolean;
  error?: string;
}

export const settleDebt = createServerFn({ method: 'POST' })
  .inputValidator(SettleDebtInputSchema)
  .handler(async ({ data }): Promise<SettleDebtResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        return {
          success: false,
          error: 'No autenticado',
        };
      }

      const currentMembership = await db.groupMember.findFirst({
        where: {
          groupId: data.groupId,
          userId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!currentMembership) {
        return {
          success: false,
          error: 'No tienes acceso a este grupo',
        };
      }

      const members = await db.groupMember.findMany({
        where: {
          groupId: data.groupId,
          id: {
            in: [data.fromMemberId, data.toMemberId],
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (members.length !== 2) {
        return {
          success: false,
          error: 'Participantes de la liquidación no válidos',
        };
      }

      const fromMember = members.find(
        (member) => member.id === data.fromMemberId,
      );
      const toMember = members.find((member) => member.id === data.toMemberId);

      if (!fromMember || !toMember) {
        return {
          success: false,
          error: 'No se pudieron identificar los participantes',
        };
      }

      if (fromMember.id === toMember.id) {
        return {
          success: false,
          error: 'La liquidación debe ser entre dos miembros distintos',
        };
      }

      await db.$transaction(async (tx) => {
        await tx.expense.create({
          data: {
            groupId: data.groupId,
            paidById: data.fromMemberId,
            description: `Liquidación: ${fromMember.name} → ${toMember.name}`,
            amount: data.amount,
            currency: data.currency,
            notes: `[SETTLEMENT:${(data.method ?? 'cards').toUpperCase()}] ${new Date().toISOString()} by ${currentMembership.id}`,
            participants: {
              create: [
                {
                  memberId: data.toMemberId,
                  share: data.amount,
                },
              ],
            },
          },
        });

        await tx.activityLog.create({
          data: {
            groupId: data.groupId,
            actorUserId: userId,
            actorName: currentMembership.name,
            action: 'debt.settled',
            targetName: `${fromMember.name} → ${toMember.name}`,
            details: {
              fromMemberId: data.fromMemberId,
              toMemberId: data.toMemberId,
              amount: data.amount,
              currency: data.currency,
              method: data.method ?? 'cards',
            },
          },
        });
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error settling debt:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo liquidar la deuda',
      };
    }
  });
