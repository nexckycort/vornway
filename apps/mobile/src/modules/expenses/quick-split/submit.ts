import type { ApiPayload, ApiSuccess } from '@vornway/api-client';
import { api, withErrorMessage } from '@/lib/api';

export type SplitMethod = 'equal' | 'percentage' | 'exact';
export type Currency = 'COP' | 'USD' | 'EUR';
export type ParticipantData = { name: string; userId?: string };
export type SharedItem = { name: string; amount: string };
export type ExistingQuickSplitExpense = ApiSuccess<
  'quickSplits',
  'expenseDetail'
>;

type ExpenseInput = ApiPayload<'quickSplits', 'createExpense'>;

type ExpenseDraft = {
  description: string;
  amount: number;
  splitMethod: SplitMethod;
  shareValues: Record<string, string>;
  category: string;
  sharedItems: SharedItem[];
};

export const toSplitMethod = (
  method: ExistingQuickSplitExpense['splitMethod'],
): SplitMethod => (method === 'unknown' ? 'equal' : method);

export const toCurrency = (currency: string): Currency =>
  currency === 'USD' || currency === 'EUR' ? currency : 'COP';

export async function updateQuickSplitExpense(
  draft: ExpenseDraft & {
    expense: ExistingQuickSplitExpense;
    participantIds: string[];
    payerIndex: string;
  },
) {
  const shares = parseShares(draft, draft.participantIds.length);
  await withErrorMessage(
    api.quickSplits.updateExpense.request({
      params: { id: draft.expense.quickSplitId, expenseId: draft.expense.id },
      payload: expenseInput(draft, {
        currency: draft.expense.currency,
        paidByParticipantId:
          draft.participantIds[Number(draft.payerIndex)] ??
          draft.expense.paidBy.id,
        participantIds: draft.participantIds,
        shares,
      }),
    }),
    'expense_update_failed',
  );
}

export async function createQuickSplitExpense(
  draft: ExpenseDraft & {
    name: string;
    friends: ParticipantData[];
    currency: Currency;
    payerIndex: string;
  },
) {
  const shares = parseShares(draft, draft.friends.length + 1);
  const group = await withErrorMessage(
    api.quickSplits.create.request({
      payload: { name: draft.name, participants: draft.friends },
    }),
    'group_failed',
  );
  const participantIds = group.participants.map(
    (participant) => participant.id,
  );
  const payer = participantIds[Number(draft.payerIndex)] ?? participantIds[0];
  if (!payer) throw new Error('participant_failed');
  await withErrorMessage(
    api.quickSplits.createExpense.request({
      params: { id: group.id },
      payload: expenseInput(draft, {
        currency: draft.currency,
        paidByParticipantId: payer,
        participantIds,
        shares,
      }),
    }),
    'expense_failed',
  );
}

const parseShares = (draft: ExpenseDraft, count: number) => {
  const shares = Array.from(
    { length: count },
    (_, index) =>
      Number((draft.shareValues[String(index)] ?? '').replace(',', '.')) || 0,
  );
  const total = shares.reduce((sum, value) => sum + value, 0);
  const expectedTotal = draft.splitMethod === 'percentage' ? 100 : draft.amount;
  if (
    !draft.description.trim() ||
    !Number.isFinite(draft.amount) ||
    draft.amount <= 0 ||
    (draft.splitMethod !== 'equal' && Math.abs(total - expectedTotal) > 0.01)
  )
    throw new Error('invalid_split');
  return shares;
};

const expenseInput = (
  draft: ExpenseDraft,
  target: {
    currency: string;
    paidByParticipantId: string;
    participantIds: string[];
    shares: number[];
  },
): ExpenseInput => {
  const sharesById = Object.fromEntries(
    target.participantIds.map((id, index) => [id, target.shares[index] ?? 0]),
  );
  const items = draft.sharedItems
    .map((item) => ({
      name: item.name.trim(),
      amount: Number(item.amount.replace(',', '.')),
    }))
    .filter((item) => item.name.length > 0 && item.amount > 0);
  return {
    description: draft.description.trim(),
    amount: draft.amount,
    currency: target.currency,
    paidByParticipantId: target.paidByParticipantId,
    splitMethod: draft.splitMethod,
    ...(draft.splitMethod === 'percentage'
      ? { percentageShares: sharesById }
      : {}),
    ...(draft.splitMethod === 'exact' ? { exactShares: sharesById } : {}),
    metadata: {
      ...(draft.category.trim() ? { category: draft.category.trim() } : {}),
      ...(draft.sharedItems.length > 0 ? { items } : {}),
    },
  };
};
