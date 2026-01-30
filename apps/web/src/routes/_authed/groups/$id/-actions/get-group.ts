import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const GetGroupInputSchema = z.object({
  groupId: z.string(),
});

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  paidBy: {
    id: string;
    name: string;
  };
  participantCount: number;
}

interface GetGroupResponse {
  name: string;
  participantCount: number;
  totals: Record<string, number>; // { "COP": 150000, "USD": 50 }
  expenses: Expense[];
  inviteCode: string | null;
}

export const getGroup = createServerFn({ method: 'POST' })
  .inputValidator(GetGroupInputSchema)
  .handler(async ({ data }): Promise<GetGroupResponse> => {
    try {
      const session = await useAppSession();
      const userId = session.data.userId;

      if (!userId) {
        throw new Error('No autenticado');
      }

      const groupRecord = await db.group.findUnique({
        select: {
          name: true,
          totals: true,
          inviteCode: true,
          GroupMember: {
            select: {
              id: true,
            },
          },
          Expense: {
            select: {
              id: true,
              description: true,
              amount: true,
              currency: true,
              date: true,
              paidBy: {
                select: {
                  id: true,
                  name: true,
                },
              },
              _count: {
                select: {
                  participants: true,
                },
              },
            },
            orderBy: { date: 'desc' },
          },
        },
        where: { id: data.groupId },
      });

      if (!groupRecord) {
        throw new Error('Grupo no encontrado');
      }

      const expenses: Expense[] = groupRecord.Expense.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        paidBy: {
          id: expense.paidBy.id,
          name: expense.paidBy.name,
        },
        participantCount: expense._count.participants,
      }));

      return {
        name: groupRecord.name,
        participantCount: groupRecord.GroupMember.length,
        totals: (groupRecord.totals as Record<string, number>) ?? {},
        expenses,
        inviteCode: groupRecord.inviteCode,
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  });
