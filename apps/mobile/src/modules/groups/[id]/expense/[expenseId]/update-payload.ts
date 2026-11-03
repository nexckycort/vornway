import type { ApiPayload, ApiSuccess } from '@vornway/api-client';

type Expense = ApiSuccess<'groups', 'getExpense'>;
type AdvancedDetails = NonNullable<Expense['advancedDetails']>;

export const toExpenseUpdatePayload = (
  expense: Expense | null,
  base: { description: string; amount: number; currency: string },
): ApiPayload<'groups', 'updateExpense'> => ({
  ...base,
  participantIds:
    expense?.participants?.map((participant) => participant.memberId) ?? [],
  ...(expense?.paidBy?.id ? { paidById: expense.paidBy.id } : {}),
  ...(expense?.paidByMembers?.length
    ? {
        paidByIds: expense.paidByMembers.map((member) => member.memberId),
        payers: expense.paidByMembers.map((member) => ({
          memberId: member.memberId,
          amount: member.amount,
        })),
      }
    : {}),
  splitMethod:
    expense?.sharedSplit?.splitMethod ??
    (expense?.splitMethod === 'unknown' ? undefined : expense?.splitMethod) ??
    'equal',
  ...(expense?.splitMethod === 'exact' && expense?.participants
    ? {
        exactShares: Object.fromEntries(
          expense.participants.map((participant) => [
            participant.memberId,
            participant.share,
          ]),
        ),
      }
    : {}),
  ...(expense?.sharedSplit ? { sharedSplit: expense.sharedSplit } : {}),
  ...(expense?.lineItems?.length ? { lineItems: expense.lineItems } : {}),
  ...(expense?.advancedDetails
    ? {
        advancedDetails: toAdvancedDetailsPayload(expense.advancedDetails),
      }
    : {}),
  ...(expense?.category?.id ? { categoryId: expense.category.id } : {}),
  ...(expense?.tags?.length ? { tags: expense.tags } : {}),
});

const toAdvancedDetailsPayload = ({ type, ...details }: AdvancedDetails) =>
  type === 'unknown' ? details : { ...details, type };
