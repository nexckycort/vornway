import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';
import { m } from '#/paraglide/messages.js';

export type UpsertQuickSplitExpenseValues = {
  currentUserId: string;
  quickSplitId?: string;
  expenseId?: string;
  name: string;
  description: string;
  participants: Array<{
    clientId: string;
    name: string;
    userId?: string;
  }>;
  amount: number;
  currency: string;
  paidByParticipantId: string;
  splitMethod: 'equal' | 'percentage' | 'exact';
  percentageShares?: Record<string, number>;
  exactShares?: Record<string, number>;
};

const createQuickSplitEndpoint = quickSplitsClient.index.$post;
const createQuickSplitExpenseEndpoint = quickSplitsClient[':id'].expenses.$post;
const updateQuickSplitExpenseEndpoint =
  quickSplitsClient[':id'].expenses[':expenseId'].$put;

async function upsertQuickSplitExpense(values: UpsertQuickSplitExpenseValues) {
  if (values.quickSplitId && values.expenseId) {
    const updateExpenseResponse = await updateQuickSplitExpenseEndpoint({
      param: {
        id: values.quickSplitId,
        expenseId: values.expenseId,
      },
      json: {
        description: values.description,
        amount: values.amount,
        currency: values.currency,
        paidByParticipantId: values.paidByParticipantId,
        splitMethod: values.splitMethod,
        ...(values.percentageShares
          ? { percentageShares: values.percentageShares }
          : {}),
        ...(values.exactShares ? { exactShares: values.exactShares } : {}),
      },
    });

    if (!updateExpenseResponse.ok) {
      const payload = (await updateExpenseResponse.json()) as {
        message?: string;
      };

      throw new Error(payload.message ?? m['system.updateExpenseFailed']());
    }

    const expense = await updateExpenseResponse.json();

    return {
      quickSplit: {
        id: values.quickSplitId,
        name: values.name,
        description: values.description,
      },
      expense,
      mode: 'update' as const,
    };
  }

  const createQuickSplitResponse = await createQuickSplitEndpoint({
    json: {
      name: values.name,
      description: values.description,
      participants: values.participants,
    },
  });

  if (!createQuickSplitResponse.ok) {
    const payload = (await createQuickSplitResponse.json()) as {
      message?: string;
    };

    throw new Error(payload.message ?? m['system.createExpenseFailed']());
  }

  const quickSplit = await createQuickSplitResponse.json();
  const participantIdByClientId = new Map<string, string>();
  const currentUserParticipantId = (quickSplit.participants ?? []).find(
    (participant) => participant.userId === values.currentUserId,
  )?.id;

  for (const participant of quickSplit.participants ?? []) {
    if (participant.clientId) {
      participantIdByClientId.set(participant.clientId, participant.id);
    }
  }

  const paidByParticipantId =
    values.paidByParticipantId === values.currentUserId
      ? currentUserParticipantId
      : participantIdByClientId.get(values.paidByParticipantId);
  if (!paidByParticipantId) {
    throw new Error(m['system.mapExpenseParticipantsFailed']());
  }

  const createExpenseResponse = await createQuickSplitExpenseEndpoint({
    param: { id: quickSplit.id },
    json: {
      description: values.description,
      amount: values.amount,
      currency: values.currency,
      paidByParticipantId,
      splitMethod: values.splitMethod,
      ...(values.percentageShares
        ? {
            percentageShares: Object.fromEntries(
              Object.entries(values.percentageShares).map(([key, value]) => [
                participantIdByClientId.get(key) ?? key,
                value,
              ]),
            ),
          }
        : {}),
      ...(values.exactShares
        ? {
            exactShares: Object.fromEntries(
              Object.entries(values.exactShares).map(([key, value]) => [
                participantIdByClientId.get(key) ?? key,
                value,
              ]),
            ),
          }
        : {}),
    },
  });

  if (!createExpenseResponse.ok) {
    const payload = (await createExpenseResponse.json()) as {
      message?: string;
    };

    throw new Error(payload.message ?? m['system.createExpenseFailed']());
  }

  const expense = await createExpenseResponse.json();

  return {
    quickSplit,
    expense,
    mode: 'create' as const,
  };
}

export function useCreateQuickSplitExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertQuickSplitExpense,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({
          queryKey: ['home-recent-quick-split-expenses'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['quick-split-expenses'],
        }),
        ...(variables.quickSplitId && variables.expenseId
          ? [
              queryClient.invalidateQueries({
                queryKey: [
                  'quick-split-expense',
                  variables.quickSplitId,
                  variables.expenseId,
                ],
              }),
            ]
          : []),
      ]);
    },
  });
}
