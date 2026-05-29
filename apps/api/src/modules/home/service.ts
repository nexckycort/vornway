import { db } from '~/infrastructure/database/connection';
import { getVersionedGroupImageUrl } from '../groups/group-image.service';
import { resolveUserImageUrl } from '../users/user-image.service';
import type { HomeParticipantBalance, HomeSummary } from './types';

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

function summarizeGroup(
  group: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    imageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    GroupMember: Array<{
      id: string;
      name: string;
      userId: string | null;
      user: { image: string | null; updatedAt: Date } | null;
    }>;
    Expense: Array<{
      amount: number;
      currency: string;
      notes?: string | null;
      paidById: string;
      payers: Array<{ memberId: string; amount: number }>;
      participants: Array<{ memberId: string; share: number }>;
    }>;
  },
  userId: string,
  currentUserProfile: {
    name: string;
    image: string | null;
    updatedAt: Date;
  } | null,
) {
  const currentMember = group.GroupMember.find(
    (member) => member.userId === userId,
  );
  const orderedMembers = currentMember
    ? [
        ...group.GroupMember.filter((member) => member.id !== currentMember.id),
        currentMember,
      ]
    : group.GroupMember;

  if (!currentMember) {
    return {
      id: group.id,
      name: group.name,
      type: group.type,
      description: group.description,
      imageUrl: getVersionedGroupImageUrl(group.imageUrl, group.updatedAt),
      createdAt: group.createdAt,
      members: orderedMembers.map((member) => ({
        id: member.id,
        name: member.name,
        image: resolveUserImageUrl(
          member.user?.image ?? null,
          member.user?.updatedAt ?? null,
        ),
      })),
      currentUser: currentUserProfile
        ? {
            memberId: userId,
            name: currentUserProfile.name,
            image: resolveUserImageUrl(
              currentUserProfile.image,
              currentUserProfile.updatedAt,
            ),
          }
        : null,
      hasExpenses: group.Expense.length > 0,
      participantBalances: [],
      totalsByCurrency: {},
    };
  }

  const balanceByMember = new Map<string, Record<string, number>>();

  for (const member of group.GroupMember) {
    balanceByMember.set(member.id, {});
  }

  for (const expense of group.Expense) {
    if (expense.participants.length === 0) continue;

    const payerEntries =
      expense.payers.length > 0
        ? expense.payers
        : [{ memberId: expense.paidById, amount: expense.amount ?? 0 }];
    for (const payer of payerEntries) {
      const payerBalances = balanceByMember.get(payer.memberId);
      if (payerBalances) {
        payerBalances[expense.currency] =
          (payerBalances[expense.currency] ?? 0) + payer.amount;
      }
    }

    for (const participant of expense.participants) {
      const participantBalances = balanceByMember.get(participant.memberId);
      if (participantBalances) {
        participantBalances[expense.currency] =
          (participantBalances[expense.currency] ?? 0) - participant.share;
      }
    }
  }

  const participantBalances: HomeParticipantBalance[] = [];
  const totalsByCurrency: Record<string, number> = {};

  for (const member of group.GroupMember) {
    if (member.id === currentMember.id) continue;

    const balances = balanceByMember.get(member.id) ?? {};
    for (const [currency, rawValue] of Object.entries(balances)) {
      if (Math.abs(rawValue) < 0.01) continue;

      const amount = normalizeAmount(Math.abs(rawValue));
      const direction: HomeParticipantBalance['direction'] =
        rawValue < 0 ? 'theyOweYou' : 'youOweThem';

      participantBalances.push({
        memberId: member.id,
        memberName: member.name,
        currency,
        amount,
        direction,
        label:
          direction === 'theyOweYou'
            ? `Te debe ${amount.toLocaleString()} ${currency}`
            : `Debes ${amount.toLocaleString()} ${currency}`,
      });

      const signedAmount = direction === 'theyOweYou' ? amount : -amount;
      totalsByCurrency[currency] = normalizeAmount(
        (totalsByCurrency[currency] ?? 0) + signedAmount,
      );
    }
  }

  return {
    id: group.id,
    name: group.name,
    type: group.type,
    description: group.description,
    imageUrl: getVersionedGroupImageUrl(group.imageUrl, group.updatedAt),
    createdAt: group.createdAt,
    members: orderedMembers.map((member) => ({
      id: member.id,
      name: member.name,
      image: resolveUserImageUrl(
        member.user?.image ?? null,
        member.user?.updatedAt ?? null,
      ),
    })),
    currentUser: {
      memberId: currentMember.id,
      name: currentMember.name,
      image: resolveUserImageUrl(
        currentMember.user?.image ?? null,
        currentMember.user?.updatedAt ?? null,
      ),
    },
    hasExpenses: group.Expense.length > 0,
    participantBalances,
    totalsByCurrency,
  };
}

function summarizeGoal(goal: {
  id: string;
  title: string;
  description: string | null;
  currency: string;
  targetAmount: number;
  endDate: Date;
  createdAt: Date;
  group: { id: string; name: string };
  contributions: Array<{ amount: number }>;
}) {
  const savedAmount = normalizeAmount(
    goal.contributions.reduce(
      (total, contribution) => total + contribution.amount,
      0,
    ),
  );
  const progress =
    goal.targetAmount > 0
      ? Math.min(100, normalizeAmount((savedAmount / goal.targetAmount) * 100))
      : 0;

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    currency: goal.currency,
    targetAmount: goal.targetAmount,
    savedAmount,
    progress,
    endDate: goal.endDate,
    createdAt: goal.createdAt,
    group: goal.group,
  };
}

export type HomeService = {
  getSummary: (userId: string) => Promise<HomeSummary>;
};

export function createHomeService(): HomeService {
  return {
    getSummary: async (userId) => {
      const groups = await db.group.findMany({
        where: {
          type: {
            not: 'meta',
          },
          OR: [
            {
              ownerId: userId,
            },
            {
              GroupMember: {
                some: {
                  userId,
                },
              },
            },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 2,
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          imageUrl: true,
          createdAt: true,
          updatedAt: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: {
                select: {
                  image: true,
                  updatedAt: true,
                },
              },
            },
          },
          Expense: {
            where: {
              status: 'ACTIVE',
              deletedAt: null,
              OR: [
                { notes: null },
                {
                  notes: {
                    not: {
                      contains: '[DELETED]',
                    },
                  },
                },
              ],
            },
            select: {
              amount: true,
              currency: true,
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

      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          image: true,
          updatedAt: true,
        },
      });

      const groupsWithBalances = groups.map((group) =>
        summarizeGroup(group, userId, currentUser),
      );

      const goals = await db.goal.findMany({
        where: {
          deletedAt: null,
          group: {
            OR: [
              {
                ownerId: userId,
              },
              {
                GroupMember: {
                  some: {
                    userId,
                  },
                },
              },
            ],
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 2,
        select: {
          id: true,
          title: true,
          description: true,
          currency: true,
          targetAmount: true,
          endDate: true,
          createdAt: true,
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          contributions: {
            select: {
              amount: true,
            },
          },
        },
      });

      const goalsWithProgress = goals.map(summarizeGoal);

      return {
        groups: groupsWithBalances,
        goals: goalsWithProgress,
      };
    },
  };
}
