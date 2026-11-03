import type { HomeGroupSummary } from '@vornway/contracts/modules/home/contract';
import {
  getVersionedGroupImageUrl,
  resolveUserImageUrl,
} from '#/infrastructure/storage/image-urls';
import { normalizeAmount } from './amounts';

type GroupRow = {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly GroupMember: readonly {
    readonly id: string;
    readonly name: string;
    readonly userId: string | null;
    readonly user: {
      readonly image: string | null;
      readonly updatedAt: Date;
    } | null;
  }[];
  readonly Expense: readonly {
    readonly amount: number;
    readonly currency: string;
    readonly paidById: string;
    readonly payers: readonly {
      readonly memberId: string;
      readonly amount: number;
    }[];
    readonly participants: readonly {
      readonly memberId: string;
      readonly share: number;
    }[];
  }[];
};

type CurrentUserProfile = {
  readonly name: string;
  readonly image: string | null;
  readonly updatedAt: Date;
} | null;

export const summarizeGroup = (
  group: GroupRow,
  userId: string,
  currentUserProfile: CurrentUserProfile,
): typeof HomeGroupSummary.Type => {
  const currentMember = group.GroupMember.find(
    (member) => member.userId === userId,
  );
  const orderedMembers = currentMember
    ? [
        ...group.GroupMember.filter((member) => member.id !== currentMember.id),
        currentMember,
      ]
    : group.GroupMember;

  const base = {
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
    hasExpenses: group.Expense.length > 0,
  };

  if (!currentMember) {
    return {
      ...base,
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
      participantBalances: [],
      totalsByCurrency: {},
    };
  }

  return {
    ...base,
    currentUser: {
      memberId: currentMember.id,
      name: currentMember.name,
      image: resolveUserImageUrl(
        currentMember.user?.image ?? null,
        currentMember.user?.updatedAt ?? null,
      ),
    },
    ...balancesFor(group, currentMember.id),
  };
};

const balancesFor = (group: GroupRow, currentMemberId: string) => {
  const isPersonalGroup = group.type === 'personal';
  const credits = new Map<string, number>();
  const debts = new Map<string, number>();
  const add = (map: Map<string, number>, key: string, amount: number) =>
    map.set(key, normalizeAmount((map.get(key) ?? 0) + amount));

  for (const expense of group.Expense) {
    if (expense.participants.length === 0) {
      if (isPersonalGroup)
        add(credits, `personal:${expense.currency}`, expense.amount);
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
      (payer) => payer.memberId === currentMemberId,
    );
    if (currentPayer) {
      for (const participant of expense.participants) {
        if (participant.memberId === currentMemberId) continue;
        const amount = normalizeAmount(
          totalPaid > 0
            ? (participant.share * currentPayer.amount) / totalPaid
            : 0,
        );
        if (amount <= 0) continue;
        add(credits, `${participant.memberId}:${expense.currency}`, amount);
      }
    }

    const currentParticipation = expense.participants.find(
      (participant) => participant.memberId === currentMemberId,
    );
    if (currentParticipation) {
      for (const payer of payerEntries) {
        if (payer.memberId === currentMemberId) continue;
        const amount = normalizeAmount(
          totalPaid > 0
            ? (currentParticipation.share * payer.amount) / totalPaid
            : 0,
        );
        if (amount <= 0) continue;
        add(debts, `${payer.memberId}:${expense.currency}`, amount);
      }
    }
  }

  const participantBalances: {
    memberId: string;
    memberName: string;
    currency: string;
    amount: number;
    direction: 'theyOweYou' | 'youOweThem';
    label: string;
  }[] = [];
  const totalsByCurrency: Record<string, number> = {};
  const currencyKeys = new Set<string>([...credits.keys(), ...debts.keys()]);

  for (const key of currencyKeys) {
    const [memberId, currency] = key.split(':');
    if (!currency) continue;
    if (memberId === 'personal' && isPersonalGroup) {
      totalsByCurrency[currency] = normalizeAmount(
        (totalsByCurrency[currency] ?? 0) + (credits.get(key) ?? 0),
      );
      continue;
    }

    const member = group.GroupMember.find((item) => item.id === memberId);
    if (!member) continue;

    const rawValue = normalizeAmount(
      (credits.get(key) ?? 0) - (debts.get(key) ?? 0),
    );
    if (Math.abs(rawValue) < 0.01) continue;

    const amount = normalizeAmount(Math.abs(rawValue));
    const direction = rawValue > 0 ? 'theyOweYou' : 'youOweThem';

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

  return { participantBalances, totalsByCurrency };
};
