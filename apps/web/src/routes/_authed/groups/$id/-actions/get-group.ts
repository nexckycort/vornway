/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
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
  isDeleted: boolean;
  paidBy: {
    id: string;
    name: string;
  };
  participantCount: number;
}

interface Member {
  id: string;
  name: string;
  role: string;
  userId: string | null;
  isCurrentUser: boolean;
}

interface GetGroupResponse {
  name: string;
  participantCount: number;
  totals: Record<string, number>; // { "COP": 150000, "USD": 50 }
  expenses: Expense[];
  inviteCode: string | null;
  members: Member[];
  isOwner: boolean;
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
          ownerId: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              role: true,
              userId: true,
            },
            orderBy: { joinedAt: 'asc' },
          },
          Expense: {
            select: {
              id: true,
              description: true,
              amount: true,
              currency: true,
              date: true,
              notes: true,
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

      // Verificar que el usuario es miembro del grupo
      const isMember = groupRecord.GroupMember.some(
        (member) => member.userId === userId,
      );

      if (!isMember) {
        throw new Error('No tienes acceso a este grupo');
      }

      const expenses: Expense[] = groupRecord.Expense.map((expense) => ({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        isDeleted: expense.notes?.includes('[DELETED]') ?? false,
        paidBy: {
          id: expense.paidBy.id,
          name: expense.paidBy.name,
        },
        participantCount: expense._count.participants,
      }));

      const members: Member[] = groupRecord.GroupMember.map((member) => ({
        id: member.id,
        name: member.name,
        role: member.role,
        userId: member.userId,
        isCurrentUser: member.userId === userId,
      }));

      return {
        name: groupRecord.name,
        participantCount: groupRecord.GroupMember.length,
        totals: (groupRecord.totals as Record<string, number>) ?? {},
        expenses,
        inviteCode: groupRecord.inviteCode,
        members,
        isOwner: groupRecord.ownerId === userId,
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  });
