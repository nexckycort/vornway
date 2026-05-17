import { useMutation } from '@tanstack/react-query';

import { toggleLocalExpensePin } from '#/lib/expense-pins';

type ToggleExpensePinInput = {
  groupId: string;
  expenseId: string;
};

async function toggleExpensePin({
  groupId,
  expenseId,
}: ToggleExpensePinInput) {
  const isPinned = toggleLocalExpensePin(groupId, expenseId);
  return { isPinned };
}

export function useToggleExpensePinMutation() {
  return useMutation({
    mutationFn: toggleExpensePin,
  });
}
