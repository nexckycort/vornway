import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import {
  type CompositeExpenseItem,
  parseExpenseMetadata,
} from '~/lib/expense-metadata';
import { useAppSession } from '~/utils/session';

const GetExpenseInputSchema = z.object({
  groupId: z.string(),
  expenseId: z.string(),
});

interface ExpenseParticipant {
  memberId: string;
  name: string;
  share: number;
  isCurrentUser: boolean;
}

interface GetExpenseResponse {
  id: string;
  groupName: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isDeleted: boolean;
  isSettlement: boolean;
  isPinned: boolean;
  expenseType: 'standard' | 'composite';
  compositeItems: CompositeExpenseItem[];
  paidBy: {
    memberId: string;
    name: string;
    isCurrentUser: boolean;
  };
  participants: ExpenseParticipant[];
}

export const getExpense = createServerFn({ method: 'POST' })
  .inputValidator(GetExpenseInputSchema)
  .handler(async ({ data }): Promise<GetExpenseResponse> => {
    const session = await useAppSession();
    const userId = session.data.userId;

    if (!userId) {
      throw new Error('No autenticado');
    }

    const currentMembership = await db.groupMember.findFirst({
      where: {
        groupId: data.groupId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!currentMembership) {
      throw new Error('No tienes acceso a este grupo');
    }

    const expenseRecord = await db.expense.findFirst({
      where: {
        id: data.expenseId,
        groupId: data.groupId,
      },
      select: {
        id: true,
        description: true,
        amount: true,
        currency: true,
        date: true,
        notes: true,
        metadata: true,
        group: {
          select: {
            name: true,
          },
        },
        paidBy: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          select: {
            share: true,
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            member: {
              joinedAt: 'asc',
            },
          },
        },
      },
    });

    if (!expenseRecord) {
      throw new Error('Gasto no encontrado');
    }

    const metadata = parseExpenseMetadata(expenseRecord.metadata);

    return {
      id: expenseRecord.id,
      groupName: expenseRecord.group.name,
      description: expenseRecord.description,
      amount: expenseRecord.amount,
      currency: expenseRecord.currency,
      date: expenseRecord.date,
      isDeleted: expenseRecord.notes?.includes('[DELETED]') ?? false,
      isSettlement: expenseRecord.notes?.includes('[SETTLEMENT') ?? false,
      isPinned: Boolean(metadata.pinnedAt),
      expenseType: metadata.expenseType,
      compositeItems: metadata.items,
      paidBy: {
        memberId: expenseRecord.paidBy.id,
        name: expenseRecord.paidBy.name,
        isCurrentUser: expenseRecord.paidBy.id === currentMembership.id,
      },
      participants: expenseRecord.participants.map((participant) => ({
        memberId: participant.member.id,
        name: participant.member.name,
        share: participant.share,
        isCurrentUser: participant.member.id === currentMembership.id,
      })),
    };
  });
