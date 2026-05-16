import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import {
  isExpenseDeleted,
  isExpenseSettlement,
  readPinnedAt,
  toClientExpenseType,
} from '~/lib/expense-state';
import { useAppSession } from '~/utils/session';

const GetMemberExpensesInputSchema = z.object({
  groupId: z.string(),
  memberId: z.string(),
});

interface MemberExpenseItem {
  id: string;
  category: {
    id: string;
    name: string;
  } | null;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isSettlement: boolean;
  isPinned: boolean;
  expenseType: 'standard' | 'composite';
  subExpenseCount: number;
  participantCount: number;
  paidBy: {
    id: string;
    name: string;
  };
  targetShare: number | null;
  isTargetPayer: boolean;
}

interface GetMemberExpensesResponse {
  groupName: string;
  member: {
    id: string;
    name: string;
    isCurrentUser: boolean;
  };
  balances: Record<string, number>;
  expenses: MemberExpenseItem[];
}

export const getMemberExpenses = createServerFn({ method: 'POST' })
  .inputValidator(GetMemberExpensesInputSchema)
  .handler(async ({ data }): Promise<GetMemberExpensesResponse> => {
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

    const groupRecord = await db.group.findUnique({
      where: {
        id: data.groupId,
      },
      select: {
        name: true,
        GroupMember: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        Expense: {
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
              select: { id: true },
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
                memberId: true,
                share: true,
              },
            },
            _count: {
              select: {
                participants: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!groupRecord) {
      throw new Error('Grupo no encontrado');
    }

    const member = groupRecord.GroupMember.find(
      (item) => item.id === data.memberId,
    );

    if (!member) {
      throw new Error('Participante no encontrado');
    }

    const balances: Record<string, number> = {};
    const expenses: MemberExpenseItem[] = [];

    for (const expense of groupRecord.Expense) {
      const isDeleted = isExpenseDeleted(expense.status);
      if (isDeleted) continue;

      const isSettlement = isExpenseSettlement(expense.expenseType);
      const targetParticipation = expense.participants.find(
        (participant) => participant.memberId === data.memberId,
      );
      const isTargetPayer = expense.paidBy.id === data.memberId;
      const isPersonal = !isSettlement && expense.participants.length === 0;

      if (!isTargetPayer && !targetParticipation) {
        continue;
      }

      if (!isPersonal) {
        if (isTargetPayer) {
          balances[expense.currency] =
            (balances[expense.currency] ?? 0) + expense.amount;
        }

        if (targetParticipation) {
          balances[expense.currency] =
            (balances[expense.currency] ?? 0) - targetParticipation.share;
        }
      }

      const pinnedAt = readPinnedAt(expense.pinnedAt);

      expenses.push({
        id: expense.id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        isSettlement,
        isPinned: Boolean(pinnedAt),
        expenseType: toClientExpenseType(expense.expenseType),
        subExpenseCount: expense.compositeItems.length,
        participantCount: expense._count.participants,
        paidBy: expense.paidBy,
        targetShare: targetParticipation?.share ?? null,
        isTargetPayer,
      });
    }

    expenses.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return {
      groupName: groupRecord.name,
      member: {
        id: member.id,
        name: member.name,
        isCurrentUser: member.userId === userId,
      },
      balances,
      expenses,
    };
  });
