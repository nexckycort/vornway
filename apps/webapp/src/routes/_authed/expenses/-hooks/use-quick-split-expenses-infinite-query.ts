import { useInfiniteQuery } from '@tanstack/react-query';
import { quickSplitsClient } from '#/api/quick-splits';
import type { InferResponseType } from '#/lib/hc';

const quickSplitExpensesEndpoint = quickSplitsClient.expenses.$get;

type QuickSplitExpensesResponse = InferResponseType<
  typeof quickSplitExpensesEndpoint,
  200
>;

export type QuickSplitExpenseListItem =
  QuickSplitExpensesResponse['data'][number];

export function useQuickSplitExpensesInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: ['quick-split-expenses'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await quickSplitExpensesEndpoint({
        query: {
          limit: '12',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar los gastos con amigos');
      }

      return (await response.json()) as QuickSplitExpensesResponse;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
