import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { parseExpenseMetadata } from '~/lib/expense-metadata';
import { useAppSession } from '~/utils/session';

const GetCategoryBreakdownInputSchema = z.object({
  groupId: z.string(),
});

interface CategoryExpenseItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: Date;
  isPinned: boolean;
  expenseType: 'standard' | 'composite';
  subExpenseCount: number;
  paidByName: string;
}

interface CategorySection {
  id: string | null;
  name: string;
  totals: Record<string, number>;
  expenseCount: number;
  expenses: CategoryExpenseItem[];
}

interface GetCategoryBreakdownResponse {
  groupName: string;
  categories: CategorySection[];
}

export const getCategoryBreakdown = createServerFn({ method: 'POST' })
  .inputValidator(GetCategoryBreakdownInputSchema)
  .handler(async ({ data }): Promise<GetCategoryBreakdownResponse> => {
    const session = await useAppSession();
    const userId = session.data.userId;

    if (!userId) {
      throw new Error('No autenticado');
    }

    const membership = await db.groupMember.findFirst({
      where: {
        groupId: data.groupId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new Error('No tienes acceso a este grupo');
    }

    const group = await db.group.findUnique({
      where: {
        id: data.groupId,
      },
      select: {
        name: true,
        categories: {
          select: {
            id: true,
            name: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
        Expense: {
          select: {
            id: true,
            description: true,
            amount: true,
            currency: true,
            date: true,
            notes: true,
            metadata: true,
            paidBy: {
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
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!group) {
      throw new Error('Grupo no encontrado');
    }

    const sections = new Map<string, CategorySection>();

    for (const category of group.categories) {
      sections.set(category.id, {
        id: category.id,
        name: category.name,
        totals: {},
        expenseCount: 0,
        expenses: [],
      });
    }

    sections.set('uncategorized', {
      id: null,
      name: 'Sin categoría',
      totals: {},
      expenseCount: 0,
      expenses: [],
    });

    for (const expense of group.Expense) {
      const isDeleted = expense.notes?.includes('[DELETED]') ?? false;
      if (isDeleted) continue;

      const metadata = parseExpenseMetadata(expense.metadata);
      const section = expense.category
        ? sections.get(expense.category.id)
        : sections.get('uncategorized');

      if (!section) continue;

      section.expenseCount += 1;
      section.totals[expense.currency] =
        (section.totals[expense.currency] ?? 0) + expense.amount;
      section.expenses.push({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date,
        isPinned: Boolean(metadata.pinnedAt),
        expenseType: metadata.expenseType,
        subExpenseCount: metadata.items.length,
        paidByName: expense.paidBy.name,
      });
    }

    return {
      groupName: group.name,
      categories: Array.from(sections.values()).filter(
        (section) => section.expenseCount > 0 || section.id !== null,
      ),
    };
  });
