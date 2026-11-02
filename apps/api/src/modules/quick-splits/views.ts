import {
  type CreatedQuickSplit,
  type QuickSplitExpenseDetail,
  type QuickSplitExpenseFeedItem,
  type QuickSplitExpenseResult,
  QuickSplitExpenseMetadata,
} from '@vornway/contracts/modules/quick-splits/contract';
import { Option, Schema } from 'effect';
import { resolveUserImageUrl } from '#/infrastructure/storage/image-urls';
import { normalizeAmount, sameCurrency } from './shares';

export type SplitMethod = 'equal' | 'percentage' | 'exact';

type Participant = { id: string; userId: string | null; name: string };
type ParticipantWithUser = Participant & {
  user: { image: string | null; updatedAt: Date } | null;
};

export const toSplitMethod = (value: string): SplitMethod | null =>
  value === 'equal' || value === 'percentage' || value === 'exact'
    ? value
    : null;

export const toCreatedQuickSplit = (
  quickSplit: {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    participants: readonly (Participant & { role: string })[];
  },
  clientIds: readonly (string | undefined)[],
): typeof CreatedQuickSplit.Type => ({
  id: quickSplit.id,
  name: quickSplit.name,
  description: quickSplit.description,
  participants: quickSplit.participants.map((participant, index) => {
    const clientId = index > 0 ? clientIds[index - 1] : undefined;
    return {
      id: participant.id,
      ...(clientId ? { clientId } : {}),
      userId: participant.userId,
      name: participant.name,
      role: participant.role,
    };
  }),
  createdAt: quickSplit.createdAt.toISOString(),
});

export const toExpenseResult = (
  expense: {
    id: string;
    quickSplitId: string;
    description: string;
    amount: number;
    currency: string;
    paidByParticipantId: string;
    createdAt: Date;
    quickSplit: { participants: readonly { id: string; share: number }[] };
  },
  splitMethod: SplitMethod,
): typeof QuickSplitExpenseResult.Type => ({
  id: expense.id,
  quickSplitId: expense.quickSplitId,
  description: expense.description,
  amount: expense.amount,
  currency: expense.currency,
  paidByParticipantId: expense.paidByParticipantId,
  splitMethod,
  participants: expense.quickSplit.participants.map((participant) => ({
    participantId: participant.id,
    share: participant.share,
  })),
  createdAt: expense.createdAt.toISOString(),
});

export const toFeedItem = (
  expense: {
    id: string;
    quickSplitId: string;
    description: string;
    amount: number;
    currency: string;
    createdAt: Date;
    paidByParticipant: Participant;
    quickSplit: {
      name: string;
      participants: readonly (ParticipantWithUser & { share: number })[];
      _count: { participants: number };
    };
    settlements: readonly {
      fromParticipantId: string;
      toParticipantId: string;
      amount: number;
      currency: string;
    }[];
  },
  userId: string,
): typeof QuickSplitExpenseFeedItem.Type => {
  const current = expense.quickSplit.participants.find(
    (participant) => participant.userId === userId,
  );
  const share = current?.share ?? 0;
  const balance =
    expense.paidByParticipant.userId === userId
      ? expense.amount - share
      : -share;
  return {
    id: expense.id,
    quickSplitId: expense.quickSplitId,
    quickSplitName: expense.quickSplit.name,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    participantCount: expense.quickSplit._count.participants,
    paidBy: {
      id: expense.paidByParticipant.id,
      userId: expense.paidByParticipant.userId,
      name: expense.paidByParticipant.name,
    },
    participants: expense.quickSplit.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      name: participant.name,
      image: userImageUrl(participant.user),
    })),
    currentUserBalance: normalizeAmount(
      balance + settlementAdjustment(expense, current?.id),
    ),
    createdAt: expense.createdAt.toISOString(),
  };
};

export const toExpenseDetail = (
  expense: {
    id: string;
    quickSplitId: string;
    description: string;
    amount: number;
    currency: string;
    metadata: unknown;
    createdAt: Date;
    paidByParticipant: ParticipantWithUser;
    quickSplit: {
      name: string;
      participants: readonly (ParticipantWithUser & {
        role: string;
        share: number;
      })[];
    };
    settlements: readonly {
      id: string;
      amount: number;
      currency: string;
      createdAt: Date;
      fromParticipant: Participant;
      toParticipant: Participant;
    }[];
  },
  splitMethod: SplitMethod,
): typeof QuickSplitExpenseDetail.Type => ({
  id: expense.id,
  quickSplitId: expense.quickSplitId,
  quickSplitName: expense.quickSplit.name,
  description: expense.description,
  amount: expense.amount,
  currency: expense.currency,
  splitMethod,
  createdAt: expense.createdAt.toISOString(),
  metadata: Option.getOrNull(decodeMetadata(expense.metadata)),
  paidBy: {
    id: expense.paidByParticipant.id,
    userId: expense.paidByParticipant.userId,
    name: expense.paidByParticipant.name,
    image: userImageUrl(expense.paidByParticipant.user),
  },
  participants: expense.quickSplit.participants.map((participant) => ({
    id: participant.id,
    userId: participant.userId,
    name: participant.name,
    image: userImageUrl(participant.user),
    share: participant.share,
    role: participant.role,
  })),
  settlements: expense.settlements.map((settlement) => ({
    id: settlement.id,
    from: toParticipantRef(settlement.fromParticipant),
    to: toParticipantRef(settlement.toParticipant),
    amount: settlement.amount,
    currency: settlement.currency,
    createdAt: settlement.createdAt.toISOString(),
  })),
});

const decodeMetadata = Schema.decodeUnknownOption(QuickSplitExpenseMetadata);

const toParticipantRef = (participant: Participant) => ({
  id: participant.id,
  userId: participant.userId,
  name: participant.name,
});

const userImageUrl = (user: ParticipantWithUser['user']) =>
  resolveUserImageUrl(user?.image, user?.updatedAt ?? null);

const settlementAdjustment = (
  expense: {
    currency: string;
    settlements: readonly {
      fromParticipantId: string;
      toParticipantId: string;
      amount: number;
      currency: string;
    }[];
  },
  participantId: string | undefined,
) =>
  participantId === undefined
    ? 0
    : expense.settlements
        .filter((settlement) =>
          sameCurrency(settlement.currency, expense.currency),
        )
        .reduce((total, settlement) => {
          if (settlement.fromParticipantId === participantId) {
            return total + settlement.amount;
          }
          if (settlement.toParticipantId === participantId) {
            return total - settlement.amount;
          }
          return total;
        }, 0);
