import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { type CompositeExpenseItem } from '~/lib/expense-metadata';
import {
  isExpenseDeleted,
  isExpenseSettlement,
  readPinnedAt,
  toClientExpenseType,
} from '~/lib/expense-state';
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
  category: {
    id: string;
    name: string;
  } | null;
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
        expenseType: true,
        status: true,
        pinnedAt: true,
        compositeItems: {
          select: {
            id: true,
            description: true,
            amount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        group: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            id: true,
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

    const expenseType = toClientExpenseType(expenseRecord.expenseType);
    const compositeItems: CompositeExpenseItem[] = expenseRecord.compositeItems.map(
      (item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount,
        createdAt: item.createdAt.toISOString(),
      }),
    );

    return {
      id: expenseRecord.id,
      groupName: expenseRecord.group.name,
      category: expenseRecord.category,
      description: expenseRecord.description,
      amount: expenseRecord.amount,
      currency: expenseRecord.currency,
      date: expenseRecord.date,
      isDeleted: isExpenseDeleted(expenseRecord.status),
      isSettlement: isExpenseSettlement(expenseRecord.expenseType),
      isPinned: Boolean(readPinnedAt(expenseRecord.pinnedAt)),
      expenseType,
      compositeItems,
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
