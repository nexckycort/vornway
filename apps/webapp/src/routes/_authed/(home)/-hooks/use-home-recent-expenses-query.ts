import { useQuery } from '@tanstack/react-query';
import type { ApiSuccess } from '@vornway/api-client';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type HomeRecentExpense = ApiSuccess<
  'quickSplits',
  'listExpenses'
>['data'][number];

export function useHomeRecentExpensesQuery() {
  return useQuery<HomeRecentExpense[]>({
    queryKey: ['home-recent-quick-split-expenses'],
    queryFn: async () => {
      const page = await failWithMessage(
        api.quickSplits.listExpenses.request({ query: { limit: 3 } }),
        m['system.loadFriendsExpensesFailed'](),
      );

      return page.data;
    },
    initialData: [],
  });
}
