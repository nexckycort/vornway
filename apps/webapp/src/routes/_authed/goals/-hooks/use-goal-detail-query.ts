import { useQuery } from '@tanstack/react-query';
import { goalsClient } from '#/api/goals';
import type { InferResponseType } from '#/api/types';

const goalDetailEndpoint = goalsClient[':id'].$get;

type GoalDetailApiResponse = InferResponseType<typeof goalDetailEndpoint>;
type GoalDetailSuccess = Extract<GoalDetailApiResponse, { group: unknown }>;

export type GoalDetailData = GoalDetailSuccess;

export function useGoalDetailQuery(goalId: string) {
  return useQuery({
    queryKey: ['goal-detail', goalId],
    queryFn: async () => {
      const response = await goalDetailEndpoint({
        param: { id: goalId },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo cargar la meta');
      }

      return (await response.json()) as GoalDetailSuccess;
    },
    staleTime: 30_000,
  });
}
