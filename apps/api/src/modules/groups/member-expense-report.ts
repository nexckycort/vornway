import type { Prisma } from '~/generated/prisma/client';
import { resolveExpenseAttachmentUrl } from './expense-attachment.service';
import { getDateEnd, getDateStart, normalizeAmount } from './helpers';
import type { ListGroupMemberExpensesResult } from './types';

type CurrentMemberRef = {
  id: string;
};

type MemberExpenseSummaryRow = {
  amount: number;
  currency: string;
  paidById: string;
  payers: Array<{
    amount: number;
  }>;
  participants: Array<{
    share: number;
  }>;
};

type MemberExpenseRow = {
  id: string;
  description: string;
  amount: number;
  attachment: string | null;
  currency: string;
  date: Date;
  notes: string | null;
  status: string;
  deletedAt: Date | null;
  category: {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
  } | null;
  paidBy: {
    id: string;
    name: string;
  };
  payers: Array<{
    memberId: string;
    amount: number;
    member: {
      name: string;
    };
  }>;
  participants: Array<{
    memberId: string;
    share: number;
    member: {
      name: string;
    };
  }>;
  _count: {
    participants: number;
  };
};

export function buildMemberExpenseWhere(input: {
  categoryId?: string;
  endDate?: string;
  memberId: string;
  paidOnly?: boolean;
  startDate?: string;
  uncategorized?: boolean;
  baseWhere: Prisma.ExpenseWhereInput;
}) {
  return {
    ...input.baseWhere,
    ...(input.paidOnly
      ? {
          OR: [
            { paidById: input.memberId },
            { payers: { some: { memberId: input.memberId } } },
          ],
        }
      : {
          OR: [
            { paidById: input.memberId },
            { payers: { some: { memberId: input.memberId } } },
            { participants: { some: { memberId: input.memberId } } },
          ],
        }),
    ...(input.categoryId
      ? { categoryId: input.categoryId }
      : input.uncategorized
        ? { categoryId: null }
        : {}),
    ...(input.startDate && input.endDate
      ? {
          date: {
            gte: getDateStart(input.startDate),
            lte: getDateEnd(input.endDate),
          },
        }
      : {}),
  } satisfies Prisma.ExpenseWhereInput;
}

export function buildMemberExpenseSummary(
  rows: MemberExpenseSummaryRow[],
  memberId: string,
) {
  const spentByCurrency = rows.reduce<Record<string, number>>(
    (accumulator, row) => {
      const share = row.participants[0]?.share ?? 0;
      if (share <= 0) return accumulator;

      accumulator[row.currency] = normalizeAmount(
        (accumulator[row.currency] ?? 0) + share,
      );
      return accumulator;
    },
    {},
  );

  const grossPaidByCurrency = rows.reduce<Record<string, number>>(
    (accumulator, row) => {
      const payerAmount =
        row.payers[0]?.amount ?? (row.paidById === memberId ? row.amount : 0);
      if (payerAmount <= 0) return accumulator;

      accumulator[row.currency] = normalizeAmount(
        (accumulator[row.currency] ?? 0) + payerAmount,
      );
      return accumulator;
    },
    {},
  );

  return {
    spentByCurrency,
    grossPaidByCurrency,
  };
}

export function mapMemberExpenseListItem(
  row: MemberExpenseRow,
  currentMember: CurrentMemberRef | null,
): ListGroupMemberExpensesResult['data'][number] {
  const isSettlement = Boolean(row.notes?.includes('[SETTLEMENT:'));
  const isPersonal = !isSettlement && row.participants.length === 0;
  const currentParticipation = currentMember
    ? row.participants.find(
        (participant) => participant.memberId === currentMember.id,
      )
    : null;
  const currentPayer = currentMember
    ? row.payers.find((payer) => payer.memberId === currentMember.id)
    : null;
  let currentUserBalance: number | null = null;

  if (!isPersonal && currentMember && (currentPayer || currentParticipation)) {
    currentUserBalance = 0;
    if (currentPayer) {
      currentUserBalance += currentPayer.amount;
    }
    if (currentParticipation) {
      currentUserBalance -= currentParticipation.share;
    }
    currentUserBalance = normalizeAmount(currentUserBalance);
  }

  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    attachmentUrl: resolveExpenseAttachmentUrl(row.attachment),
    currency: row.currency,
    date: row.date,
    isDeleted: row.status === 'DELETED' || Boolean(row.deletedAt),
    isSettlement,
    isPersonal,
    expenseType: 'standard',
    subExpenseCount: 0,
    settlementToName: isSettlement
      ? (row.participants[0]?.member.name ?? null)
      : null,
    paidBy: row.paidBy,
    paidByMembers: row.payers.map((payer) => ({
      memberId: payer.memberId,
      name: payer.member.name,
      amount: payer.amount,
    })),
    participants: row.participants.map((participant) => ({
      memberId: participant.memberId,
      name: participant.member.name,
      share: participant.share,
    })),
    category: row.category,
    participantCount: row._count.participants,
    currentUserBalance,
  };
}
