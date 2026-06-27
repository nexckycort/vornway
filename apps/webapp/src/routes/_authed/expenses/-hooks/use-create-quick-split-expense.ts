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
  splitMethod: 'equal' | 'percentage' | 'exact';
  percentageShares?: Record<string, number>;
  exactShares?: Record<string, number>;
};

const createQuickSplitEndpoint = quickSplitsClient.index.$post;
const createQuickSplitExpenseEndpoint = quickSplitsClient[':id'].expenses.$post;

async function upsertQuickSplitExpense(values: UpsertQuickSplitExpenseValues) {
  if (values.quickSplitId && values.expenseId) {
    const updateExpenseResponse = await createQuickSplitExpenseEndpoint({
      param: {
        id: values.quickSplitId,
      },
      json: {
        id: values.expenseId,
        description: values.description,
        amount: values.amount,
        currency: values.currency,
        paidByUserId: values.paidByUserId,
        participantUserIds: values.expenseParticipantUserIds,
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
      splitMethod: values.splitMethod,
      ...(values.percentageShares
        ? { percentageShares: values.percentageShares }
        : {}),
      ...(values.exactShares ? { exactShares: values.exactShares } : {}),
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
