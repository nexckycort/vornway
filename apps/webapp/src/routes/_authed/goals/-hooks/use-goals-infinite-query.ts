import { useInfiniteQuery } from '@tanstack/react-query';
import { goalsClient } from '#/api/goals';
import type { InferResponseType } from '#/api/types';
import { m } from '#/paraglide/messages.js';

const goalsEndpoint = goalsClient.index.$get;

type GoalsApiResponse = InferResponseType<typeof goalsEndpoint>;

export type GoalListItem = GoalsApiResponse['data'][number];

export function useGoalsInfiniteQuery(search: string) {
  const normalizedSearch = search.trim();

  return useInfiniteQuery({
    queryKey: ['goals-list', normalizedSearch],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await goalsEndpoint({
        query: {
          limit: '12',
          ...(pageParam ? { cursor: pageParam } : {}),
          ...(normalizedSearch ? { search: normalizedSearch } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(m['goals.loadError']());
      }

      return (await response.json()) as GoalsApiResponse;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
