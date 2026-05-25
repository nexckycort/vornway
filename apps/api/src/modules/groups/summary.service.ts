import { db } from '~/infrastructure/database/connection';
import { resolveUserImageUrl } from '../users/user-image.service';
import { getVersionedGroupImageUrl } from './group-image.service';
import {
  buildActiveExpenseWhere,
  buildGroupAccessWhere,
  normalizeAmount,
} from './helpers';
import type { GroupSummaryResult } from './types';

export function createGroupSummaryService() {
  return {
    getGroupSummary: async ({
      userId,
      groupId,
    }: {
      userId: string;
      groupId: string;
    }): Promise<GroupSummaryResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          imageUrl: true,
          inviteCode: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
          totals: true,
          categories: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
            },
            orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
          },
          GroupMember: {
            select: {
              id: true,
              name: true,
              role: true,
              userId: true,
              user: {
                select: {
                  email: true,
                  image: true,
                  updatedAt: true,
                },
              },
            },
            orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
          },
          Expense: {
            where: buildActiveExpenseWhere(),
            select: {
              amount: true,
              currency: true,
              paidById: true,
              participants: {
                select: {
                  memberId: true,
                  share: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const myMembership =
        group.GroupMember.find((member) => member.userId === userId) ?? null;
      const groupExpenses = await db.expense.findMany({
        where: {
          groupId,
        },
        select: {
          categoryId: true,
        },
      });
      const memberNameById = new Map(
        group.GroupMember.map((member) => [member.id, member.name]),
      );
      const balanceByMember = new Map<string, Record<string, number>>();
      const expenseCountByMember = new Map<string, number>();
      const directDebtByPair = new Map<string, number>();
      const allDebtByPair = new Map<string, number>();
      const categoryExpenseCount = new Map<string, number>();

      for (const expense of groupExpenses) {
        if (!expense.categoryId) continue;
        categoryExpenseCount.set(
          expense.categoryId,
          (categoryExpenseCount.get(expense.categoryId) ?? 0) + 1,
        );
      }

      for (const member of group.GroupMember) {
        balanceByMember.set(member.id, {});
        expenseCountByMember.set(member.id, 0);
      }

      for (const expense of group.Expense) {
        if (expense.participants.length === 0) continue;

        const payerCount = expenseCountByMember.get(expense.paidById);
        if (payerCount !== undefined) {
          expenseCountByMember.set(expense.paidById, payerCount + 1);
        }

        const payerBalances = balanceByMember.get(expense.paidById);
        if (payerBalances) {
          payerBalances[expense.currency] = normalizeAmount(
            (payerBalances[expense.currency] ?? 0) + expense.amount,
          );
        }

        for (const participant of expense.participants) {
          const currentCount = expenseCountByMember.get(participant.memberId);
          if (currentCount !== undefined) {
            expenseCountByMember.set(participant.memberId, currentCount + 1);
          }

          const participantBalances = balanceByMember.get(participant.memberId);
          if (participantBalances) {
            participantBalances[expense.currency] = normalizeAmount(
              (participantBalances[expense.currency] ?? 0) - participant.share,
            );
          }

          if (participant.memberId !== expense.paidById) {
            const key = `${participant.memberId}:${expense.paidById}:${expense.currency}`;
            allDebtByPair.set(
              key,
              normalizeAmount(
                (allDebtByPair.get(key) ?? 0) + participant.share,
              ),
            );
          }
        }

        if (!myMembership) continue;

        if (expense.paidById === myMembership.id) {
          for (const participant of expense.participants) {
            if (participant.memberId === myMembership.id) continue;
            const key = `${participant.memberId}:${expense.currency}`;
            directDebtByPair.set(
              key,
              normalizeAmount(
                (directDebtByPair.get(key) ?? 0) - participant.share,
              ),
            );
          }
          continue;
        }

        const currentParticipation = expense.participants.find(
          (participant) => participant.memberId === myMembership.id,
        );
        if (!currentParticipation) continue;

        const key = `${expense.paidById}:${expense.currency}`;
        directDebtByPair.set(
          key,
          normalizeAmount(
            (directDebtByPair.get(key) ?? 0) + currentParticipation.share,
          ),
        );
      }

      const directDebts = Array.from(directDebtByPair.entries())
        .map(([pairKey, amount]) => {
          const [toMemberId, currency] = pairKey.split(':');
          return {
            toMemberId,
            toName: memberNameById.get(toMemberId) ?? 'Miembro',
            currency,
            amount: normalizeAmount(amount),
          };
        })
        .filter((entry) => entry.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      const directCredits = Array.from(directDebtByPair.entries())
        .map(([pairKey, amount]) => {
          const [fromMemberId, currency] = pairKey.split(':');
          return {
            fromMemberId,
            fromName: memberNameById.get(fromMemberId) ?? 'Miembro',
            currency,
            amount: normalizeAmount(Math.abs(amount)),
          };
        })
        .filter((entry) => entry.amount > 0)
        .filter((entry) => {
          const key = `${entry.fromMemberId}:${entry.currency}`;
          return (directDebtByPair.get(key) ?? 0) < 0;
        })
        .sort((a, b) => b.amount - a.amount);

      const settlementDebts = Array.from(allDebtByPair.entries())
        .map(([pairKey, amount]) => {
          const [fromMemberId, toMemberId, currency] = pairKey.split(':');
          const reverseAmount =
            allDebtByPair.get(`${toMemberId}:${fromMemberId}:${currency}`) ?? 0;
          return {
            fromMemberId,
            fromName: memberNameById.get(fromMemberId) ?? 'Miembro',
            toMemberId,
            toName: memberNameById.get(toMemberId) ?? 'Miembro',
            currency,
            amount: normalizeAmount(amount - reverseAmount),
          };
        })
        .filter((entry) => entry.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      return {
        id: group.id,
        name: group.name,
        type: group.type,
        description: group.description,
        imageUrl: getVersionedGroupImageUrl(group.imageUrl, group.updatedAt),
        inviteCode: group.inviteCode,
        ownerId: group.ownerId,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        totals: (group.totals as Record<string, number>) ?? {},
        participantCount: group.GroupMember.length,
        categories: group.categories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          expenseCount: categoryExpenseCount.get(category.id) ?? 0,
        })),
        members: group.GroupMember.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.user?.email ?? null,
          image: resolveUserImageUrl(
            member.user?.image ?? null,
            member.user?.updatedAt ?? null,
          ),
          role: member.role,
          userId: member.userId,
          isCurrentUser: member.userId === userId,
          expenseCount: expenseCountByMember.get(member.id) ?? 0,
        })),
        memberBalances: group.GroupMember.map((member) => ({
          memberId: member.id,
          name: member.name,
          isCurrentUser: member.userId === userId,
          balances: balanceByMember.get(member.id) ?? {},
        })),
        directDebts,
        directCredits,
        settlementDebts,
        myMembership: myMembership
          ? {
              id: myMembership.id,
              name: myMembership.name,
              role: myMembership.role,
            }
          : null,
        isOwner: group.ownerId === userId,
      };
    },
  };
}
