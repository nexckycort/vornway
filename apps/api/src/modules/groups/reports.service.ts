import { db } from '~/infrastructure/database/connection';
import {
  buildGroupAccessWhere,
  buildReportExpenseWhere,
  normalizeAmount,
} from './helpers';
import type {
  GroupReportsBalancesInput,
  GroupReportsBalancesResult,
  GroupReportsSharesInput,
  GroupReportsSharesResult,
  GroupReportsTotalsInput,
  GroupReportsTotalsResult,
} from './types';

export function createGroupReportsService() {
  return {
    getGroupReportsTotals: async ({
      userId,
      groupId,
      range,
    }: GroupReportsTotalsInput): Promise<GroupReportsTotalsResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const currentMember = await db.groupMember.findFirst({
        where: {
          groupId: group.id,
          userId,
        },
        select: {
          id: true,
        },
      });

      const expenses = await db.expense.findMany({
        where: buildReportExpenseWhere({
          groupId: group.id,
          range,
        }),
        select: {
          amount: true,
          currency: true,
          notes: true,
          paidById: true,
          payers: {
            select: {
              memberId: true,
              amount: true,
            },
          },
          participants: {
            select: {
              memberId: true,
              share: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      });

      const currencyTotals = new Map<string, number>();
      const currencyExpenseCounts = new Map<string, number>();
      const currentUserSpentByCurrency = new Map<string, number>();
      const currencyCategories = new Map<
        string,
        Map<
          string,
          {
            name: string;
            icon: string | null;
            color: string | null;
            amount: number;
          }
        >
      >();

      const palette = [
        '#ff7fa3',
        '#f6c15b',
        '#8dd3ff',
        '#7ddfa8',
        '#c4a6ff',
        '#ffae63',
      ];

      for (const expense of expenses) {
        if (expense.notes?.includes('[DELETED]')) continue;
        if (expense.notes?.includes('[SETTLEMENT:')) continue;

        const isPersonal = expense.participants.length === 0;
        if (isPersonal) continue;

        currencyTotals.set(
          expense.currency,
          normalizeAmount(
            (currencyTotals.get(expense.currency) ?? 0) + expense.amount,
          ),
        );
        currencyExpenseCounts.set(
          expense.currency,
          (currencyExpenseCounts.get(expense.currency) ?? 0) + 1,
        );

        if (currentMember) {
          const myOwedAmount =
            expense.participants.find(
              (participant) => participant.memberId === currentMember.id,
            )?.share ?? 0;
          if (myOwedAmount !== 0) {
            currentUserSpentByCurrency.set(
              expense.currency,
              normalizeAmount(
                (currentUserSpentByCurrency.get(expense.currency) ?? 0) +
                  myOwedAmount,
              ),
            );
          }
        }

        const categoryName = expense.category?.name?.trim() || 'Sin categoría';
        const categoryKey = expense.category?.id ?? categoryName;
        const categoryMap =
          currencyCategories.get(expense.currency) ??
          new Map<
            string,
            {
              name: string;
              icon: string | null;
              color: string | null;
              amount: number;
            }
          >();
        const currentCategory = categoryMap.get(categoryKey);
        categoryMap.set(categoryKey, {
          name: categoryName,
          icon: expense.category?.icon ?? null,
          color: expense.category?.color ?? null,
          amount: normalizeAmount(
            (currentCategory?.amount ?? 0) + expense.amount,
          ),
        });
        currencyCategories.set(expense.currency, categoryMap);
      }

      return {
        range,
        totalsByCurrency: Object.fromEntries(currencyTotals.entries()),
        expenseCountByCurrency: Object.fromEntries(
          currencyExpenseCounts.entries(),
        ),
        currentUserSpentByCurrency: Object.fromEntries(
          currentUserSpentByCurrency.entries(),
        ),
        categoriesByCurrency: Object.fromEntries(
          Array.from(currencyCategories.entries()).map(([currencyKey, map]) => [
            currencyKey,
            Array.from(map.values())
              .map((category, index) => ({
                name: category.name,
                icon: category.icon,
                amount: category.amount,
                fill:
                  category.color ??
                  palette[index % palette.length] ??
                  '#94a3b8',
              }))
              .sort((left, right) => right.amount - left.amount),
          ]),
        ),
      };
    },
    getGroupReportsBalances: async ({
      userId,
      groupId,
      range,
    }: GroupReportsBalancesInput): Promise<GroupReportsBalancesResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const expenses = await db.expense.findMany({
        where: buildReportExpenseWhere({
          groupId: group.id,
          range,
        }),
        select: {
          amount: true,
          currency: true,
          notes: true,
          paidById: true,
          payers: {
            select: {
              memberId: true,
              amount: true,
            },
          },
          participants: {
            select: {
              memberId: true,
              share: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      });

      const balancesByMember = new Map<string, Record<string, number>>();
      for (const member of group.GroupMember) {
        balancesByMember.set(member.id, {});
      }

      for (const expense of expenses) {
        if (expense.notes?.includes('[DELETED]')) continue;
        if (expense.notes?.includes('[SETTLEMENT:')) continue;
        if (expense.participants.length === 0) continue;

        const payerEntries =
          expense.payers.length > 0
            ? expense.payers
            : [{ memberId: expense.paidById, amount: expense.amount }];

        for (const payer of payerEntries) {
          const payerBalances = balancesByMember.get(payer.memberId);
          if (payerBalances) {
            payerBalances[expense.currency] = normalizeAmount(
              (payerBalances[expense.currency] ?? 0) + payer.amount,
            );
          }
        }

        for (const participant of expense.participants) {
          const participantBalances = balancesByMember.get(
            participant.memberId,
          );
          if (participantBalances) {
            participantBalances[expense.currency] = normalizeAmount(
              (participantBalances[expense.currency] ?? 0) - participant.share,
            );
          }
        }
      }

      return {
        range,
        memberBalances: group.GroupMember.map((member) => ({
          memberId: member.id,
          name: member.name,
          isCurrentUser: member.userId === userId,
          balances: balancesByMember.get(member.id) ?? {},
        })),
      };
    },
    getGroupReportsShares: async ({
      userId,
      groupId,
      range,
    }: GroupReportsSharesInput): Promise<GroupReportsSharesResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const expenses = await db.expense.findMany({
        where: buildReportExpenseWhere({
          groupId: group.id,
          range,
        }),
        select: {
          notes: true,
          currency: true,
          participants: {
            select: {
              memberId: true,
              share: true,
            },
          },
        },
        orderBy: [{ date: 'asc' }, { id: 'asc' }],
      });

      const sharesByMember = new Map<string, Record<string, number>>();
      for (const member of group.GroupMember) {
        sharesByMember.set(member.id, {});
      }

      for (const expense of expenses) {
        if (expense.notes?.includes('[DELETED]')) continue;
        if (expense.notes?.includes('[SETTLEMENT:')) continue;
        if (expense.participants.length === 0) continue;

        for (const participant of expense.participants) {
          const memberShares = sharesByMember.get(participant.memberId);
          if (!memberShares) continue;

          memberShares[expense.currency] = normalizeAmount(
            (memberShares[expense.currency] ?? 0) + participant.share,
          );
        }
      }

      return {
        range,
        memberShares: group.GroupMember.map((member) => ({
          memberId: member.id,
          name: member.name,
          isCurrentUser: member.userId === userId,
          shares: sharesByMember.get(member.id) ?? {},
        })),
      };
    },
  };
}
