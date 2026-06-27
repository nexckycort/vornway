import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';

export type UpsertQuickSplitExpenseValues = {
  quickSplitId?: string;
  expenseId?: string;
  name: string;
  description: string;
  participantUserIds: string[];
  amount: number;
  currency: string;
  paidByUserId: string;
  expenseParticipantUserIds: string[];
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
        paidByUserId: values.paidByUserId,
        participantUserIds: values.expenseParticipantUserIds,
        splitMethod: 'equal',
      },
    });

    if (!updateExpenseResponse.ok) {
      const payload = (await updateExpenseResponse.json()) as {
        message?: string;
      };

      throw new Error(payload.message ?? 'No se pudo actualizar el gasto');
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
      participantUserIds: values.participantUserIds,
    },
  });

  if (!createQuickSplitResponse.ok) {
    const payload = (await createQuickSplitResponse.json()) as {
      message?: string;
    };

    throw new Error(payload.message ?? 'No se pudo crear el gasto rápido');
  }

  const quickSplit = await createQuickSplitResponse.json();

  const createExpenseResponse = await createQuickSplitExpenseEndpoint({
    param: { id: quickSplit.id },
    json: {
      description: values.description,
      amount: values.amount,
      currency: values.currency,
      paidByUserId: values.paidByUserId,
      participantUserIds: values.expenseParticipantUserIds,
      splitMethod: 'equal',
    },
  });

  if (!createExpenseResponse.ok) {
    const payload = (await createExpenseResponse.json()) as {
      message?: string;
    };

    throw new Error(payload.message ?? 'No se pudo crear el gasto');
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
