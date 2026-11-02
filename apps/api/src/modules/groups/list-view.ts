import type { GroupListItem } from '@vornway/contracts/modules/groups/schemas';
import type { Prisma } from '#/generated/prisma/client';
import {
  getVersionedGroupImageUrl,
  resolveUserImageUrl,
} from '#/infrastructure/storage/image-urls';
import { pairwiseBalances } from './balances';
import {
  activeExpenses,
  calculateTotalsByCurrency,
  normalizeAmount,
} from './helpers';

export const groupListSelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  imageUrl: true,
  inviteCode: true,
  createdAt: true,
  updatedAt: true,
  totals: true,
  GroupMember: {
    select: {
      id: true,
      name: true,
      role: true,
      userId: true,
      user: { select: { image: true, updatedAt: true } },
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

export type GroupListRow = Prisma.GroupGetPayload<{
  select: typeof groupListSelect;
}>;
export type GroupListFilter = 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';
export type CurrentUserIdentity = {
  name: string | null;
  image: string | null;
  updatedAt: Date;
} | null;

export const toGroupListItem = (
  row: GroupListRow,
  userId: string,
  currentUser: CurrentUserIdentity,
): typeof GroupListItem.Type => {
  const currentMember =
    row.GroupMember.find((member) => member.userId === userId) ?? null;
  const orderedMembers = currentMember
    ? [
        ...row.GroupMember.filter((member) => member.id !== currentMember.id),
        currentMember,
      ]
    : row.GroupMember;

  const participantBalances = currentMember
    ? pairwiseBalances(row.Expense, currentMember.id).flatMap((balance) => {
        const member = row.GroupMember.find(
          (item) => item.id === balance.memberId,
        );
        if (!member) return [];
        const amount = normalizeAmount(Math.abs(balance.net));
        const direction = balance.net > 0 ? 'theyOweYou' : 'youOweThem';
        return [
          {
            memberId: member.id,
            memberName: member.name,
            currency: balance.currency,
            amount,
            direction,
            label:
              direction === 'theyOweYou'
                ? `Te debe ${amount.toLocaleString()} ${balance.currency}`
                : `Debes ${amount.toLocaleString()} ${balance.currency}`,
          } as const,
        ];
      })
    : [];

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    imageUrl: getVersionedGroupImageUrl(row.imageUrl, row.updatedAt),
    inviteCode: row.inviteCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    participantCount: row.GroupMember.length,
    totals: calculateTotalsByCurrency(row.Expense, {
      includeParticipantlessExpenses: row.type === 'personal',
    }),
    members: orderedMembers.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.name,
      image: resolveUserImageUrl(member.user?.image, member.user?.updatedAt),
    })),
    currentUser: currentMember
      ? {
          memberId: currentMember.id,
          name: currentMember.name,
          image: resolveUserImageUrl(
            currentMember.user?.image,
            currentMember.user?.updatedAt,
          ),
        }
      : currentUser
        ? {
            memberId: userId,
            name: currentUser.name ?? 'Usuario',
            image: resolveUserImageUrl(
              currentUser.image,
              currentUser.updatedAt,
            ),
          }
        : null,
    hasExpenses: row.Expense.length > 0,
    participantBalances,
    myMembership: currentMember
      ? {
          id: currentMember.id,
          name: currentMember.name,
          role: currentMember.role,
        }
      : null,
  };
};

export const matchesFilter = (
  group: typeof GroupListItem.Type,
  filter: GroupListFilter,
) => {
  if (filter === 'all') return true;
  const hasCredits = group.participantBalances.some(
    (item) => item.direction === 'theyOweYou',
  );
  const hasDebts = group.participantBalances.some(
    (item) => item.direction === 'youOweThem',
  );
  if (filter === 'theyOweYou') return hasCredits;
  if (filter === 'youOweThem') return hasDebts;
  return !hasCredits && !hasDebts;
};
