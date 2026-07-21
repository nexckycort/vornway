import { useQuery } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';
import { m } from '#/paraglide/messages.js';

export type QuickSplitExpenseDetail = {
  id: string;
  quickSplitId: string;
  quickSplitName: string;
  description: string;
  amount: number;
  currency: string;
  splitMethod: 'equal' | 'percentage' | 'exact';
  createdAt: string;
  paidBy: {
    id: string;
    userId: string | null;
    name: string;
    image: string | null;
  };
  participants: Array<{
    id: string;
    userId: string | null;
    name: string;
    image: string | null;
    share: number;
    role: string;
  }>;
  settlements: Array<{
    id: string;
    from: {
      id: string;
      userId: string | null;
      name: string;
    };
    to: {
      id: string;
      userId: string | null;
      name: string;
    };
    amount: number;
    currency: string;
    createdAt: string;
  }>;
};

const quickSplitExpenseEndpoint =
  quickSplitsClient[':id'].expenses[':expenseId'].$get;

export function useQuickSplitExpenseQuery(
  quickSplitId: string | undefined,
  expenseId: string | undefined,
) {
  return useQuery({
    queryKey: ['quick-split-expense', quickSplitId, expenseId],
    enabled: Boolean(quickSplitId && expenseId),
    queryFn: async () => {
      if (!quickSplitId || !expenseId) {
        throw new Error(m['system.expenseNotFound']());
      }

      const response = await quickSplitExpenseEndpoint({
        param: {
          id: quickSplitId,
          expenseId,
        },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? m['system.loadExpenseFailed']());
      }

      return (await response.json()) as QuickSplitExpenseDetail;
    },
  });
}
