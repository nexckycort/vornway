import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

type DeleteQuickSplitExpenseInput = {
  quickSplitId: string;
  expenseId: string;
};

function deleteQuickSplitExpense({
  quickSplitId,
  expenseId,
}: DeleteQuickSplitExpenseInput) {
  return withErrorMessage(
    api.quickSplits.deleteExpense.request({
      params: { id: quickSplitId, expenseId },
    }),
    m['system.deleteExpenseFailed'](),
  );
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
