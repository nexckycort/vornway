import { useQuery } from '@tanstack/react-query';
import type { ApiSuccess } from '@vornway/api-client';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type QuickSplitExpenseDetail = ApiSuccess<
  'quickSplits',
  'expenseDetail'
>;

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

      return withErrorMessage(
        api.quickSplits.expenseDetail.request({
          params: { id: quickSplitId, expenseId },
        }),
        m['system.loadExpenseFailed'](),
      );
    },
  });
}
