import { useQuery } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';

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
        throw new Error('Gasto no encontrado');
      }

      const response = await quickSplitExpenseEndpoint({
        param: {
          id: quickSplitId,
          expenseId,
        },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? 'No se pudo cargar el gasto');
      }

      return (await response.json()) as QuickSplitExpenseDetail;
    },
  });
}
