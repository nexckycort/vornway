import type {
  ExpenseDetail,
  ExpenseListItem,
  MemberExpenseListItem,
} from '@vornway/contracts/modules/groups/expense-schemas';
import type { Prisma } from '#/generated/prisma/client';
import { resolveGroupImageUrl } from '#/infrastructure/storage/image-urls';
import {
  readAdvancedDetails,
  readExpenseTags,
  readSharedSplit,
} from './expense-metadata';
import { isSettlement, normalizeAmount, readSplitMethod } from './helpers';

const categorySelect = {
  select: { id: true, name: true, icon: true, color: true },
} satisfies Prisma.ExpenseCategoryDefaultArgs;

export const expenseListSelect = {
  id: true,
  description: true,
  amount: true,
  attachment: true,
  currency: true,
  date: true,
  metadata: true,
  notes: true,
  status: true,
  deletedAt: true,
  category: categorySelect,
  paidBy: { select: { id: true, name: true } },
  payers: {
    select: {
      memberId: true,
      amount: true,
      member: { select: { name: true } },
    },
    orderBy: [{ id: 'asc' }],
  },
  participants: {
    select: {
      memberId: true,
      share: true,
      member: { select: { name: true } },
    },
  },
  _count: { select: { participants: true } },
} satisfies Prisma.ExpenseSelect;

export const expenseDetailSelect = {
  id: true,
  description: true,
  amount: true,
  accountId: true,
  attachment: true,
  currency: true,
  date: true,
  notes: true,
  status: true,
  deletedAt: true,
  metadata: true,
  category: categorySelect,
  paidBy: { select: { id: true, name: true } },
  payers: {
    select: {
      memberId: true,
      amount: true,
      member: { select: { name: true } },
    },
    orderBy: [{ id: 'asc' }],
  },
  participants: {
    select: {
      memberId: true,
      share: true,
      compositeItems: {
        select: { description: true, amount: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
      member: { select: { name: true } },
    },
    orderBy: [{ memberId: 'asc' }],
  },
} satisfies Prisma.ExpenseSelect;

type ExpenseListRow = Prisma.ExpenseGetPayload<{
  select: typeof expenseListSelect;
}>;
type ExpenseDetailRow = Prisma.ExpenseGetPayload<{
  select: typeof expenseDetailSelect;
}>;

export const toExpenseListItem = (
  row: ExpenseListRow,
  groupType: string,
  currentMemberId: string | null,
): typeof ExpenseListItem.Type => {
  const settlement = isSettlement(row.notes);
  const personal =
    !settlement && (groupType === 'personal' || row.participants.length === 0);
  const payer = row.payers.find((item) => item.memberId === currentMemberId);
  const participation = row.participants.find(
    (item) => item.memberId === currentMemberId,
  );

  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    attachmentUrl: resolveGroupImageUrl(row.attachment),
    currency: row.currency,
    date: row.date.toISOString(),
    isDeleted: row.status === 'DELETED' || Boolean(row.deletedAt),
    isSettlement: settlement,
    isPersonal: personal,
    expenseType: 'standard',
    subExpenseCount: 0,
    settlementToName: settlement
      ? (row.participants[0]?.member.name ?? null)
      : null,
    paidBy: row.paidBy,
    paidByMembers: row.payers.map((item) => ({
      memberId: item.memberId,
      name: item.member.name,
      amount: item.amount,
    })),
    category: row.category,
    participantCount: row._count.participants,
    currentUserBalance:
      !personal && currentMemberId && (payer || participation)
        ? normalizeAmount((payer?.amount ?? 0) - (participation?.share ?? 0))
        : null,
    tags: readExpenseTags(row.metadata),
  };
};

export const toMemberExpenseListItem = (
  row: ExpenseListRow,
  groupType: string,
  currentMemberId: string | null,
): typeof MemberExpenseListItem.Type => ({
  ...toExpenseListItem(row, groupType, currentMemberId),
  participants: row.participants.map((participant) => ({
    memberId: participant.memberId,
    name: participant.member.name,
    share: participant.share,
  })),
});

export const toExpenseDetail = (
  expense: ExpenseDetailRow,
): typeof ExpenseDetail.Type => ({
  id: expense.id,
  description: expense.description,
  amount: expense.amount,
  accountId: expense.accountId,
  attachmentUrl: resolveGroupImageUrl(expense.attachment),
  currency: expense.currency,
  date: expense.date.toISOString(),
  isDeleted: expense.status === 'DELETED' || Boolean(expense.deletedAt),
  isSettlement: isSettlement(expense.notes),
  splitMethod: readSplitMethod(expense.metadata, expense.participants),
  category: expense.category,
  paidBy: expense.paidBy,
  paidByMembers: expense.payers.map((payer) => ({
    memberId: payer.memberId,
    name: payer.member.name,
    amount: payer.amount,
  })),
  participants: expense.participants.map((participant) => ({
    memberId: participant.memberId,
    name: participant.member.name,
    share: participant.share,
  })),
  lineItems: expense.participants.flatMap((participant) =>
    participant.compositeItems.map((item) => ({
      memberId: participant.memberId,
      description: item.description,
      amount: item.amount,
    })),
  ),
  sharedSplit: readSharedSplit(expense.metadata),
  advancedDetails: readAdvancedDetails(expense.metadata),
  tags: readExpenseTags(expense.metadata),
});
