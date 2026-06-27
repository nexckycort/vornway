import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';

export type CreateQuickSplitExpenseValues = {
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

async function createQuickSplitExpense(values: CreateQuickSplitExpenseValues) {
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
  };
}

export function useCreateQuickSplitExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuickSplitExpense,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      void queryClient.invalidateQueries({
        queryKey: ['home-recent-quick-split-expenses'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['quick-split-expenses'],
      });
    },
  });
}
