import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiSuccess, Cursor } from '@vornway/api-client';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type GoalListItem = ApiSuccess<'goals', 'list'>['data'][number];

export function useGoalsInfiniteQuery(search: string) {
  const normalizedSearch = search.trim();

  return useInfiniteQuery({
    queryKey: ['goals-list', normalizedSearch],
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) =>
      failWithMessage(
        api.goals.list.request({
          query: {
            limit: 12,
            ...(pageParam ? { cursor: pageParam } : {}),
            ...(normalizedSearch ? { search: normalizedSearch } : {}),
          },
        }),
        m['goals.loadError'](),
      ),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
