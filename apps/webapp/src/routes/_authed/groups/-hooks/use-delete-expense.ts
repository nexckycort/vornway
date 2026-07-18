import type { InfiniteData } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsClient } from '#/api/groups';

const deleteExpenseEndpoint =
  groupsClient[':id'].expenses[':expenseId'].$delete;

type DeleteExpenseInput = {
  groupId: string;
  expenseId: string;
};

type GroupExpensesInfiniteData = InfiniteData<{
  data: Array<{ id: string }>;
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
}>;

async function deleteExpense({ groupId, expenseId }: DeleteExpenseInput) {
  const response = await deleteExpenseEndpoint({
    param: {
      id: groupId,
      expenseId,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? 'No se pudo eliminar el gasto');
  }

  return response.json() as Promise<{ id: string }>;
}

export function useDeleteExpenseMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: async ({ id: deletedExpenseId }) => {
      queryClient.setQueryData<GroupExpensesInfiniteData>(
        ['group-expenses', groupId],
        (current) => {
          if (!current) return current;

          const wasDeleted = current.pages.some((page) =>
            page.data.some((expense) => expense.id === deletedExpenseId),
          );

          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.filter(
                (expense) => expense.id !== deletedExpenseId,
              ),
              pagination: {
                ...page.pagination,
                total: wasDeleted
                  ? Math.max(0, page.pagination.total - 1)
                  : page.pagination.total,
              },
            })),
          };
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-summary', groupId] }),
        queryClient.invalidateQueries({
          queryKey: ['group-expenses', groupId],
        }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
      ]);
    },
  });
}
