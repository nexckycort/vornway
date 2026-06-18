import { db } from '~/infrastructure/database/connection';
import { resolveUserImageUrl } from '../users/user-image.service';
import { getVersionedGroupImageUrl } from './group-image.service';
import {
  buildActiveExpenseWhere,
  buildGroupAccessWhere,
  calculateTotalsByCurrency,
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
          advancedExpenseDetailsEnabled: true,
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
          },
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const myMembership =
        group.GroupMember.find((member) => member.userId === userId) ?? null;
      const totals = calculateTotalsByCurrency(group.Expense);
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
      const directDebtByCounterparty = new Map<string, number>();
      const directCreditByCounterparty = new Map<string, number>();
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

        const payerEntries =
          expense.payers.length > 0
            ? expense.payers
            : [{ memberId: expense.paidById, amount: expense.amount }];
        const totalPaid = payerEntries.reduce(
          (total, payer) => total + payer.amount,
          0,
        );

        const involvedMemberIds = new Set([
          ...payerEntries.map((payer) => payer.memberId),
          ...expense.participants.map((participant) => participant.memberId),
        ]);
        for (const memberId of involvedMemberIds) {
          const currentCount = expenseCountByMember.get(memberId);
          if (currentCount !== undefined) {
            expenseCountByMember.set(memberId, currentCount + 1);
          }
        }

        for (const payer of payerEntries) {
          const payerBalances = balanceByMember.get(payer.memberId);
          if (payerBalances) {
            payerBalances[expense.currency] = normalizeAmount(
              (payerBalances[expense.currency] ?? 0) + payer.amount,
            );
          }
        }

        for (const participant of expense.participants) {
          const participantBalances = balanceByMember.get(participant.memberId);
          if (participantBalances) {
            participantBalances[expense.currency] = normalizeAmount(
              (participantBalances[expense.currency] ?? 0) - participant.share,
            );
          }
        }

        if (!myMembership) continue;

        const currentPayer = payerEntries.find(
          (payer) => payer.memberId === myMembership.id,
        );
        if (currentPayer) {
          for (const participant of expense.participants) {
            if (participant.memberId === myMembership.id) continue;

            const amount = normalizeAmount(
              totalPaid > 0
                ? (participant.share * currentPayer.amount) / totalPaid
                : 0,
            );
            if (amount <= 0) continue;

            const key = `${participant.memberId}:${expense.currency}`;
            directCreditByCounterparty.set(
              key,
              normalizeAmount(
                (directCreditByCounterparty.get(key) ?? 0) + amount,
              ),
            );
          }
        }

        const currentParticipation = expense.participants.find(
          (participant) => participant.memberId === myMembership.id,
        );
        if (!currentParticipation) continue;

        for (const payer of payerEntries) {
          if (payer.memberId === myMembership.id) continue;

          const amount = normalizeAmount(
            totalPaid > 0
              ? (currentParticipation.share * payer.amount) / totalPaid
              : 0,
          );
          if (amount <= 0) continue;

          const key = `${payer.memberId}:${expense.currency}`;
          directDebtByCounterparty.set(
            key,
            normalizeAmount((directDebtByCounterparty.get(key) ?? 0) + amount),
          );
        }
      }

      const directBalanceKeys = new Set<string>([
        ...Array.from(directDebtByCounterparty.keys()),
        ...Array.from(directCreditByCounterparty.keys()),
      ]);

      const directDebts: GroupSummaryResult['directDebts'] = [];
      const directCredits: GroupSummaryResult['directCredits'] = [];

      for (const pairKey of directBalanceKeys) {
        const [memberId, currency] = pairKey.split(':');
        const credits = directCreditByCounterparty.get(pairKey) ?? 0;
        const debts = directDebtByCounterparty.get(pairKey) ?? 0;
        const netAmount = normalizeAmount(credits - debts);

        if (Math.abs(netAmount) < 0.01) continue;

        if (netAmount > 0) {
          directCredits.push({
            fromMemberId: memberId,
            fromName: memberNameById.get(memberId) ?? 'Miembro',
            currency,
            amount: netAmount,
          });
          continue;
        }

        directDebts.push({
          toMemberId: memberId,
          toName: memberNameById.get(memberId) ?? 'Miembro',
          currency,
          amount: normalizeAmount(Math.abs(netAmount)),
        });
      }

      directDebts.sort((a, b) => b.amount - a.amount);
      directCredits.sort((a, b) => b.amount - a.amount);

      const settlementDebts = myMembership
        ? group.GroupMember.flatMap((member) => {
            if (member.id === myMembership.id) return [];

            const balances = balanceByMember.get(member.id) ?? {};
            return Object.entries(balances)
              .map(([currency, balance]) => {
                const amount = normalizeAmount(Math.abs(balance));
                if (amount <= 0.01) return null;

                return balance > 0
                  ? {
                      fromMemberId: myMembership.id,
                      fromName: myMembership.name,
                      toMemberId: member.id,
                      toName: member.name,
                      currency,
                      amount,
                    }
                  : {
                      fromMemberId: member.id,
                      fromName: member.name,
                      toMemberId: myMembership.id,
                      toName: myMembership.name,
                      currency,
                      amount,
                    };
              })
              .filter(
                (
                  entry,
                ): entry is {
                  fromMemberId: string;
                  fromName: string;
                  toMemberId: string;
                  toName: string;
                  currency: string;
                  amount: number;
                } => entry !== null,
              );
          })
        : [];

      settlementDebts.sort((a, b) => b.amount - a.amount);

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
        advancedExpenseDetailsEnabled: group.advancedExpenseDetailsEnabled,
        totals,
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
