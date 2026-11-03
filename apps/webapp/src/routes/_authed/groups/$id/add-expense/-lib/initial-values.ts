import type { ExpenseAdvancedDetails } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import type {
  useGroupExpenseQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import {
  emptyAdvancedDetails,
  type ExpenseLineItem,
  type ExpenseSharedSplit,
  type SharedExpenseItem,
  type SplitMethod,
} from './expense-form.types';
import {
  createExpenseLineItem,
  createSharedExpenseItem,
  formatEditableNumber,
  tagsToInput,
} from './expense-form.utils';

export type ExpenseGroup = NonNullable<
  ReturnType<typeof useGroupSummaryQuery>['data']
>;
export type ExpenseRecord = NonNullable<
  ReturnType<typeof useGroupExpenseQuery>['data']
>;

export type InitialExpenseValues = {
  description: string;
  amount: string;
  lineItems: ExpenseLineItem[];
  sharedExpenseItems: SharedExpenseItem[];
  currency: string;
  categoryId: string | null;
  selectedAccountId: string;
  tagsInput: string;
  paidByIds: string[];
  participantIds: string[];
  splitMethod: SplitMethod;
  participantValues: Record<string, string>;
  advancedDetails: ExpenseAdvancedDetails;
};

const blankValues: InitialExpenseValues = {
  description: '',
  amount: '',
  lineItems: [],
  sharedExpenseItems: [],
  currency: 'COP',
  categoryId: null,
  selectedAccountId: '',
  tagsInput: '',
  paidByIds: [],
  participantIds: [],
  splitMethod: 'equal',
  participantValues: {},
  advancedDetails: emptyAdvancedDetails,
};

export function getInitialExpenseValues({
  group,
  expense,
  isEditMode,
}: {
  group: ExpenseGroup;
  expense: ExpenseRecord | undefined;
  isEditMode: boolean;
}): InitialExpenseValues {
  if (!isEditMode) return getNewExpenseValues(group);
  if (!expense) return blankValues;

  return getEditExpenseValues(group, expense);
}

export function getRestoredPayerValues(expense: ExpenseRecord) {
  return Object.fromEntries(
    (expense.paidByMembers.length > 0
      ? expense.paidByMembers
      : [
          {
            memberId: expense.paidBy.id,
            amount: expense.amount,
          },
        ]
    ).map((payer) => [payer.memberId, formatEditableNumber(payer.amount)]),
  );
}

function getNewExpenseValues(group: ExpenseGroup): InitialExpenseValues {
  const defaultPayerId = group.myMembership?.id ?? group.members[0]?.id ?? '';

  return {
    ...blankValues,
    paidByIds: [defaultPayerId],
    participantIds:
      group.type === 'personal'
        ? [defaultPayerId]
        : group.members.map((member) => member.id),
  };
}

function getEditExpenseValues(
  group: ExpenseGroup,
  expense: ExpenseRecord,
): InitialExpenseValues {
  const sharedSplit =
    (expense as { sharedSplit?: ExpenseSharedSplit | null }).sharedSplit ??
    null;

  return {
    description: expense.description,
    amount: expense.amount.toString(),
    lineItems: (expense.lineItems ?? []).map((item) =>
      createExpenseLineItem(item.memberId, {
        description: item.description,
        amount: formatEditableNumber(item.amount),
      }),
    ),
    sharedExpenseItems:
      sharedSplit?.items && sharedSplit.items.length > 0
        ? sharedSplit.items.map((item) =>
            createSharedExpenseItem({
              name: item.name,
              amount: formatEditableNumber(item.amount),
            }),
          )
        : sharedSplit
          ? [
              createSharedExpenseItem({
                name: '',
                amount: formatEditableNumber(sharedSplit.amount),
              }),
            ]
          : [],
    currency: expense.currency,
    categoryId: expense.category?.id ?? null,
    selectedAccountId:
      ((expense as { accountId?: string | null }).accountId ?? '') || '',
    tagsInput: tagsToInput(expense.tags),
    paidByIds:
      expense.paidByMembers.length > 0
        ? expense.paidByMembers.map((payer) => payer.memberId)
        : [expense.paidBy.id],
    participantIds:
      group.type === 'personal'
        ? [group.myMembership?.id ?? expense.paidBy.id]
        : expense.participants.map((participant) => participant.memberId),
    splitMethod:
      sharedSplit?.splitMethod ??
      (expense.splitMethod === 'unknown' ? 'equal' : expense.splitMethod),
    participantValues: Object.fromEntries(
      expense.participants.map((participant) => {
        const restoredSplitMethod =
          sharedSplit?.splitMethod ?? expense.splitMethod;
        const restoredValue = sharedSplit?.splitValues?.[participant.memberId];
        const sharedShareFallback =
          sharedSplit?.amount && expense.participants.length > 0
            ? sharedSplit.amount / expense.participants.length
            : 0;

        return [
          participant.memberId,
          typeof restoredValue === 'number'
            ? formatEditableNumber(restoredValue)
            : restoredSplitMethod === 'percentage'
              ? formatEditableNumber((participant.share / expense.amount) * 100)
              : formatEditableNumber(participant.share - sharedShareFallback),
        ];
      }),
    ),
    advancedDetails: {
      ...emptyAdvancedDetails,
      ...(expense as { advancedDetails?: ExpenseAdvancedDetails | null })
        .advancedDetails,
    },
  };
}
