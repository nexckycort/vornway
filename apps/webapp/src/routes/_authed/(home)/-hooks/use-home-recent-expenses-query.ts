import { useQuery } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';
import type { InferResponseType } from '#/api/types';

const recentQuickSplitExpensesEndpoint = quickSplitsClient.expenses.$get;

type RecentQuickSplitExpensesResponse = InferResponseType<
  typeof recentQuickSplitExpensesEndpoint,
  200
>;

export type HomeRecentExpense =
  RecentQuickSplitExpensesResponse['data'][number];

export function useHomeRecentExpensesQuery() {
  return useQuery<HomeRecentExpense[]>({
    queryKey: ['home-recent-quick-split-expenses'],
    queryFn: async () => {
      const response = await recentQuickSplitExpensesEndpoint({
        query: {
          limit: '3',
        },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar los gastos con amigos');
      }

      const payload =
        (await response.json()) as RecentQuickSplitExpensesResponse;

      return payload.data;
    },
    initialData: [],
  });
}
