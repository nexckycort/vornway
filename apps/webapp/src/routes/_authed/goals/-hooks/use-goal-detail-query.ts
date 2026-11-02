import { useQuery } from '@tanstack/react-query';
import type { ApiSuccess } from '@vornway/api-client';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type GoalDetailData = ApiSuccess<'goals', 'get'>;

export function useGoalDetailQuery(goalId: string) {
  return useQuery({
    queryKey: ['goal-detail', goalId],
    queryFn: () =>
      withErrorMessage(
        api.goals.get.request({ params: { id: goalId } }),
        m['system.loadGoalFailed'](),
      ),
    staleTime: 30_000,
  });
}
