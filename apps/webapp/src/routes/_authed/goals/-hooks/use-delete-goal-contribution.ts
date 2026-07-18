import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsClient } from '#/api/goals';
import type { InferResponseType } from '#/api/types';
import { m } from '#/paraglide/messages.js';

const deleteGoalContributionEndpoint =
  goalsClient[':id'].contributions[':contributionId'].$delete;

type DeleteGoalContributionResponse = InferResponseType<
  typeof deleteGoalContributionEndpoint
>;

export function useDeleteGoalContributionMutation(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contributionId: string) => {
      const response = await deleteGoalContributionEndpoint({
        param: { id: goalId, contributionId },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(
          payload.error ?? m['system.deleteGoalContributionFailed'](),
        );
      }

      return (await response.json()) as DeleteGoalContributionResponse;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-detail', goalId] }),
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
}
