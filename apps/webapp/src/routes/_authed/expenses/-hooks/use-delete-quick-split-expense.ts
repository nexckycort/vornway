import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';

const deleteQuickSplitExpenseEndpoint =
  quickSplitsClient[':id'].expenses[':expenseId'].$delete;

type DeleteQuickSplitExpenseInput = {
  quickSplitId: string;
  expenseId: string;
};

async function deleteQuickSplitExpense({
  quickSplitId,
  expenseId,
}: DeleteQuickSplitExpenseInput) {
  const response = await deleteQuickSplitExpenseEndpoint({
    param: {
      id: quickSplitId,
      expenseId,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(
      payload?.message ?? 'No se pudo eliminar el gasto con amigos',
    );
  }

  return response.json() as Promise<{ id: string }>;
}

export function useDeleteQuickSplitExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteQuickSplitExpense,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['home-recent-quick-split-expenses'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['quick-split-expenses'],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            'quick-split-expense',
            variables.quickSplitId,
            variables.expenseId,
          ],
        }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
}
