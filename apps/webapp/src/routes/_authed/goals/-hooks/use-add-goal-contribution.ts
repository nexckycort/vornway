import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsClient } from '#/api/goals';
import type { InferRequestType, InferResponseType } from '#/api/types';

const addGoalContributionEndpoint = goalsClient[':id'].contributions.$post;

type AddGoalContributionRequest = InferRequestType<
  typeof addGoalContributionEndpoint
>;
type AddGoalContributionResponse = InferResponseType<
  typeof addGoalContributionEndpoint
>;

export function useAddGoalContributionMutation(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: AddGoalContributionRequest['json']) => {
      const response = await addGoalContributionEndpoint({
        param: { id: goalId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo registrar el aporte');
      }

      return (await response.json()) as AddGoalContributionResponse;
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
