import type { GroupSummary } from '@vornway/contracts/modules/groups/schemas';
import type { Prisma } from '#/generated/prisma/client';
import {
  getVersionedGroupImageUrl,
  resolveUserImageUrl,
} from '#/infrastructure/storage/image-urls';
import { pairwiseBalances, payerEntries } from './balances';
import {
  activeExpenses,
  calculateTotalsByCurrency,
  normalizeAmount,
} from './helpers';

export const groupSummarySelect = {
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
    select: { id: true, name: true, icon: true, color: true },
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
  },
  GroupMember: {
    select: {
      id: true,
      name: true,
      role: true,
      userId: true,
      user: { select: { email: true, image: true, updatedAt: true } },
    },
    orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
  },
  Expense: {
    where: activeExpenses(),
    select: {
      amount: true,
      currency: true,
      notes: true,
      paidById: true,
      payers: { select: { memberId: true, amount: true } },
      participants: { select: { memberId: true, share: true } },
    },
  },
} satisfies Prisma.GroupSelect;

export type GroupSummaryRow = Prisma.GroupGetPayload<{
  select: typeof groupSummarySelect;
}>;

export const toGroupSummary = (
  group: GroupSummaryRow,
  categoryExpenseCounts: ReadonlyMap<string, number>,
  userId: string,
): typeof GroupSummary.Type => {
  const myMembership =
    group.GroupMember.find((member) => member.userId === userId) ?? null;
  const nameById = new Map(
    group.GroupMember.map((member) => [member.id, member.name]),
  );
  const balanceByMember = new Map<string, Record<string, number>>(
    group.GroupMember.map((member) => [member.id, {}]),
  );
  const expenseCountByMember = new Map<string, number>(
    group.GroupMember.map((member) => [member.id, 0]),
  );

  for (const expense of group.Expense) {
    if (expense.participants.length === 0) continue;
    const payers = payerEntries(expense);

    for (const memberId of new Set([
      ...payers.map((payer) => payer.memberId),
      ...expense.participants.map((participant) => participant.memberId),
    ])) {
      const count = expenseCountByMember.get(memberId);
      if (count !== undefined) expenseCountByMember.set(memberId, count + 1);
    }
    const adjust = (memberId: string, delta: number) => {
      const balances = balanceByMember.get(memberId);
      if (balances) {
        balances[expense.currency] = normalizeAmount(
          (balances[expense.currency] ?? 0) + delta,
        );
      }
    };
    for (const payer of payers) adjust(payer.memberId, payer.amount);
    for (const participant of expense.participants) {
      adjust(participant.memberId, -participant.share);
    }
  }

  const direct = myMembership
    ? pairwiseBalances(group.Expense, myMembership.id)
    : [];
  const byAmountDesc = <T extends { amount: number }>(items: T[]) =>
    items.sort((a, b) => b.amount - a.amount);

  const settlementDebts = myMembership
    ? group.GroupMember.flatMap((member) =>
        member.id === myMembership.id
          ? []
          : Object.entries(balanceByMember.get(member.id) ?? {}).flatMap(
              ([currency, balance]) => {
                const amount = normalizeAmount(Math.abs(balance));
                if (amount <= 0.01) return [];
                const [from, to] =
                  balance > 0 ? [myMembership, member] : [member, myMembership];
                return [
                  {
                    fromMemberId: from.id,
                    fromName: from.name,
                    toMemberId: to.id,
                    toName: to.name,
                    currency,
                    amount,
                  },
                ];
              },
            ),
      )
    : [];

  return {
    id: group.id,
    name: group.name,
    type: group.type,
    description: group.description,
    imageUrl: getVersionedGroupImageUrl(group.imageUrl, group.updatedAt),
    inviteCode: group.inviteCode,
    ownerId: group.ownerId,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
    advancedExpenseDetailsEnabled: group.advancedExpenseDetailsEnabled,
    totals: calculateTotalsByCurrency(group.Expense, {
      includeParticipantlessExpenses: group.type === 'personal',
    }),
    participantCount: group.GroupMember.length,
    categories: group.categories.map((category) => ({
      ...category,
      expenseCount: categoryExpenseCounts.get(category.id) ?? 0,
    })),
    members: group.GroupMember.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.user?.email ?? null,
      image: resolveUserImageUrl(member.user?.image, member.user?.updatedAt),
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
    directDebts: byAmountDesc(
      direct
        .filter((balance) => balance.net < 0)
        .map((balance) => ({
          toMemberId: balance.memberId,
          toName: nameById.get(balance.memberId) ?? 'Miembro',
          currency: balance.currency,
          amount: normalizeAmount(Math.abs(balance.net)),
        })),
    ),
    directCredits: byAmountDesc(
      direct
        .filter((balance) => balance.net > 0)
        .map((balance) => ({
          fromMemberId: balance.memberId,
          fromName: nameById.get(balance.memberId) ?? 'Miembro',
          currency: balance.currency,
          amount: balance.net,
        })),
    ),
    settlementDebts: byAmountDesc(settlementDebts),
    myMembership: myMembership
      ? {
          id: myMembership.id,
          name: myMembership.name,
          role: myMembership.role,
        }
      : null,
    isOwner: group.ownerId === userId,
  };
};
