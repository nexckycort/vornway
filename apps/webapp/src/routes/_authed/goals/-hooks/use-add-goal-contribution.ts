import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiPayload } from '@vornway/api-client';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export function useAddGoalContributionMutation(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ApiPayload<'goals', 'addContribution'>) =>
      withErrorMessage(
        api.goals.addContribution.request({ params: { id: goalId }, payload }),
        m['system.addGoalContributionFailed'](),
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-detail', goalId] }),
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
}
