import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toggleLocalExpensePin } from '#/lib/expense-pins';

type ToggleExpensePinInput = {
  groupId: string;
  expenseId: string;
};

async function toggleExpensePin({ groupId, expenseId }: ToggleExpensePinInput) {
  const isPinned = toggleLocalExpensePin(groupId, expenseId);
  return { isPinned };
}

export function useToggleExpensePinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleExpensePin,
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['group-expenses', variables.groupId],
        }),
        queryClient.invalidateQueries({
          queryKey: ['group-pinned-expenses', variables.groupId],
        }),
      ]);
    },
  });
}
