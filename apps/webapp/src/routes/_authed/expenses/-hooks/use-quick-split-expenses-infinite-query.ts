import { useInfiniteQuery } from '@tanstack/react-query';
import type { ApiSuccess, Cursor } from '@vornway/api-client';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type QuickSplitExpenseListItem = ApiSuccess<
  'quickSplits',
  'listExpenses'
>['data'][number];

export function useQuickSplitExpensesInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: ['quick-split-expenses'],
    initialPageParam: undefined as Cursor | undefined,
    queryFn: ({ pageParam }) =>
      failWithMessage(
        api.quickSplits.listExpenses.request({
          query: {
            limit: 12,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        }),
        m['system.loadFriendsExpensesFailed'](),
      ),
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
