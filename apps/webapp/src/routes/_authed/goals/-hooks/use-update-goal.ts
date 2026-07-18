import { useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsClient } from '#/api/goals';
import type { InferRequestType, InferResponseType } from '#/api/types';

const updateGoalEndpoint = goalsClient[':id'].$patch;

type UpdateGoalRequest = InferRequestType<typeof updateGoalEndpoint>;
type UpdateGoalResponse = InferResponseType<typeof updateGoalEndpoint>;

export function useUpdateGoalMutation(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: UpdateGoalRequest['json']) => {
      const response = await updateGoalEndpoint({
        param: { id: goalId },
        json,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo actualizar la meta');
      }

      return (await response.json()) as UpdateGoalResponse;
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
