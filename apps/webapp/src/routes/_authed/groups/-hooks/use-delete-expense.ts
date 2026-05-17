import { client } from '#/lib/hc';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const deleteExpenseEndpoint = (
  client.api.groups[':id'].expenses as unknown as {
    ':expenseId': (input: {
      param: {
        id: string;
        expenseId: string;
      };
    }) => Promise<Response>;
  }
)[':expenseId'];

type DeleteExpenseInput = {
  groupId: string;
  expenseId: string;
};

async function deleteExpense({ groupId, expenseId }: DeleteExpenseInput) {
  const response = await deleteExpenseEndpoint({
    param: {
      id: groupId,
      expenseId,
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? 'No se pudo eliminar el gasto');
  }

  return response.json() as Promise<{ id: string }>;
}

export function useDeleteExpenseMutation(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-summary', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['group-expenses', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
      ]);
    },
  });
}
