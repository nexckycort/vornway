import { db } from '~/infrastructure/database/connection';
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
    GroupMember: Array<{
      id: string;
      name: string;
      userId: string | null;
      user: { image: string | null } | null;
    }>;
    Expense: Array<{
      currency: string;
      paidById: string;
      participants: Array<{ memberId: string; share: number }>;
    }>;
  },
  userId: string,
  currentUserProfile: {
    name: string;
    image: string | null;
  } | null,
) {
  const currentMember = group.GroupMember.find((member) => member.userId === userId);
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
        imageUrl: group.imageUrl,
        createdAt: group.createdAt,
      members: orderedMembers.map((member) => ({
        id: member.id,
        name: member.name,
        image: member.user?.image ?? null,
      })),
      currentUser: currentUserProfile
        ? {
            memberId: userId,
            name: currentUserProfile.name,
            image: currentUserProfile.image,
          }
        : null,
      hasExpenses: group.Expense.length > 0,
      participantBalances: [],
      totalsByCurrency: {},
    };
  }

  const pairBalances = new Map<string, number>();

  for (const expense of group.Expense) {
    if (expense.participants.length === 0) continue;

    if (expense.paidById === currentMember.id) {
      for (const participant of expense.participants) {
        if (participant.memberId === currentMember.id) continue;
        const key = `${participant.memberId}:${expense.currency}`;
        pairBalances.set(key, (pairBalances.get(key) ?? 0) - participant.share);
      }
      continue;
    }

    const ownShare = expense.participants.find(
      (participant) => participant.memberId === currentMember.id,
    );
    if (!ownShare) continue;

    const key = `${expense.paidById}:${expense.currency}`;
    pairBalances.set(key, (pairBalances.get(key) ?? 0) + ownShare.share);
  }

  const participantBalances: HomeParticipantBalance[] = [];
  const totalsByCurrency: Record<string, number> = {};

  for (const [key, rawValue] of pairBalances.entries()) {
    if (Math.abs(rawValue) < 0.01) continue;

    const [memberId, currency] = key.split(':');
    const member = group.GroupMember.find((item) => item.id === memberId);
    const direction: HomeParticipantBalance['direction'] =
      rawValue < 0 ? 'theyOweYou' : 'youOweThem';
    const amount = normalizeAmount(Math.abs(rawValue));

    participantBalances.push({
      memberId,
      memberName: member?.name ?? 'Participante',
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

  return {
    id: group.id,
    name: group.name,
    type: group.type,
    description: group.description,
    imageUrl: group.imageUrl,
    createdAt: group.createdAt,
    members: orderedMembers.map((member) => ({
      id: member.id,
      name: member.name,
      image: member.user?.image ?? null,
    })),
    currentUser: {
      memberId: currentMember.id,
      name: currentMember.name,
      image: currentMember.user?.image ?? null,
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
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
              user: {
                select: {
                  image: true,
                },
              },
            },
          },
          Expense: {
            where: {
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
