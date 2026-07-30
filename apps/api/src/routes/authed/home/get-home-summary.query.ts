import { db } from '#/infrastructure/database/connection';
import { getVersionedGroupImageUrl } from '#/infrastructure/storage/group-images';
import { resolveUserImageUrl } from '#/infrastructure/storage/user-images';
import type {
  HomeDebtSummary,
  HomeParticipantBalance,
  HomeSummary,
} from './types';

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

  const creditsByCounterparty = new Map<string, number>();
  const debtsByCounterparty = new Map<string, number>();
  const isPersonalGroup = group.type === 'personal';

  for (const expense of group.Expense) {
    if (expense.participants.length === 0) {
      if (isPersonalGroup) {
        const key = `personal:${expense.currency}`;
        creditsByCounterparty.set(
          key,
          normalizeAmount(
            (creditsByCounterparty.get(key) ?? 0) + expense.amount,
          ),
        );
      }
      continue;
    }

    const payerEntries =
      expense.payers.length > 0
        ? expense.payers
        : [{ memberId: expense.paidById, amount: expense.amount ?? 0 }];
    const totalPaid = payerEntries.reduce(
      (total, payer) => total + payer.amount,
      0,
    );

    const currentPayer = payerEntries.find(
      (payer) => payer.memberId === currentMember.id,
    );
    if (currentPayer) {
      for (const participant of expense.participants) {
        if (participant.memberId === currentMember.id) continue;

        const amount = normalizeAmount(
          totalPaid > 0
            ? (participant.share * currentPayer.amount) / totalPaid
            : 0,
        );
        if (amount <= 0) continue;

        const key = `${participant.memberId}:${expense.currency}`;
        creditsByCounterparty.set(
          key,
          normalizeAmount((creditsByCounterparty.get(key) ?? 0) + amount),
        );
      }
    }

    const currentParticipation = expense.participants.find(
      (participant) => participant.memberId === currentMember.id,
    );
    if (currentParticipation) {
      for (const payer of payerEntries) {
        if (payer.memberId === currentMember.id) continue;

        const amount = normalizeAmount(
          totalPaid > 0
            ? (currentParticipation.share * payer.amount) / totalPaid
            : 0,
        );
        if (amount <= 0) continue;

        const key = `${payer.memberId}:${expense.currency}`;
        debtsByCounterparty.set(
          key,
          normalizeAmount((debtsByCounterparty.get(key) ?? 0) + amount),
        );
      }
    }
  }

  const participantBalances: HomeParticipantBalance[] = [];
  const totalsByCurrency: Record<string, number> = {};
  const currencyKeys = new Set<string>([
    ...Array.from(creditsByCounterparty.keys()),
    ...Array.from(debtsByCounterparty.keys()),
  ]);

  for (const key of currencyKeys) {
    const [memberId, currency] = key.split(':');
    if (memberId === 'personal' && isPersonalGroup) {
      totalsByCurrency[currency] = normalizeAmount(
        (totalsByCurrency[currency] ?? 0) +
          (creditsByCounterparty.get(key) ?? 0),
      );
      continue;
    }

    const member = group.GroupMember.find((item) => item.id === memberId);
    if (!member) continue;

    const credits = creditsByCounterparty.get(key) ?? 0;
    const debts = debtsByCounterparty.get(key) ?? 0;
    const rawValue = normalizeAmount(credits - debts);
    if (Math.abs(rawValue) < 0.01) continue;

    const amount = normalizeAmount(Math.abs(rawValue));
    const direction: HomeParticipantBalance['direction'] =
      rawValue > 0 ? 'theyOweYou' : 'youOweThem';

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

    totalsByCurrency[currency] = normalizeAmount(
      (totalsByCurrency[currency] ?? 0) +
        (direction === 'theyOweYou' ? amount : -amount),
    );
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

function summarizeDebt(
  debt: {
    id: string;
    name: string;
    ownerId: string;
    counterpartyName: string;
    direction: string;
    currency: string;
    expectedTotal: number;
    dueDate: Date | null;
    updatedAt: Date;
    payments: Array<{ amount: number }>;
  },
  userId: string,
): HomeDebtSummary {
  const paidAmount = normalizeAmount(
    debt.payments.reduce((total, payment) => total + payment.amount, 0),
  );
  const remainingAmount = normalizeAmount(
    Math.max(debt.expectedTotal - paidAmount, 0),
  );
  const status =
    remainingAmount <= 0
      ? 'paid'
      : debt.dueDate && debt.dueDate < new Date()
        ? 'overdue'
        : 'active';

  const ownerDirection: HomeDebtSummary['direction'] =
    debt.direction === 'borrowed' ? 'borrowed' : 'lent';
  const direction: HomeDebtSummary['direction'] =
    debt.ownerId === userId
      ? ownerDirection
      : ownerDirection === 'lent'
        ? 'borrowed'
        : 'lent';

  return {
    id: debt.id,
    name: debt.name,
    counterpartyName: debt.counterpartyName,
    direction,
    currency: debt.currency,
    expectedTotal: debt.expectedTotal,
    paidAmount,
    remainingAmount,
    status,
    updatedAt: debt.updatedAt,
  };
}

export type HomeSummaryQuery = {
  getSummary: (userId: string) => Promise<HomeSummary>;
};

export function createHomeSummaryQuery(): HomeSummaryQuery {
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

      const recentDebts = await db.debt.findMany({
        where: {
          OR: [{ ownerId: userId }, { counterpartyId: userId }],
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 2,
        select: {
          id: true,
          name: true,
          ownerId: true,
          counterpartyName: true,
          direction: true,
          currency: true,
          expectedTotal: true,
          dueDate: true,
          updatedAt: true,
          payments: {
            select: {
              amount: true,
            },
          },
        },
      });

      return {
        groups: groupsWithBalances,
        goals: goalsWithProgress,
        recentDebts: recentDebts.map((debt) => summarizeDebt(debt, userId)),
      };
    },
  };
}
