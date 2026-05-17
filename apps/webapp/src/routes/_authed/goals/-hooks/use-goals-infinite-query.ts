import type { InferResponseType } from '#/lib/hc';
import { client } from '#/lib/hc';
import { useInfiniteQuery } from '@tanstack/react-query';

const goalsEndpoint = client.api.goals.$get;

type GoalsApiResponse = InferResponseType<typeof goalsEndpoint>;

export type GoalListItem = GoalsApiResponse['data'][number];

export function useGoalsInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: ['goals-list'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await goalsEndpoint({
        query: {
          limit: '12',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar las metas');
      }

      return (await response.json()) as GoalsApiResponse;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
