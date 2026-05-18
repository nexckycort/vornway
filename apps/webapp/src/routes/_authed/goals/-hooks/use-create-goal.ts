import { client } from '#/lib/hc';
import type { InferRequestType, InferResponseType } from '#/lib/hc';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const createGoalEndpoint = client.api.goals.$post;

type CreateGoalRequest = InferRequestType<typeof createGoalEndpoint>;
type CreateGoalResponse = InferResponseType<typeof createGoalEndpoint>;

export type CreateGoalFormValues = {
  name: string;
  description: string;
  currency: string;
  targetAmount: string;
  startDate: string;
  endDate: string;
  installmentCount: string;
  installmentAmount: string;
  participants: Array<{
    name: string;
    userId?: string;
  }>;
};

async function createGoal(values: CreateGoalFormValues): Promise<CreateGoalResponse> {
  const payload: CreateGoalRequest = {
    json: {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      currency: values.currency.trim().toUpperCase(),
      targetAmount: Number(values.targetAmount),
      startDate: values.startDate,
      endDate: values.endDate,
      installmentCount: Number(values.installmentCount),
      ...(values.installmentAmount.trim()
        ? { installmentAmount: Number(values.installmentAmount) }
        : {}),
      ...(values.participants.length > 0
        ? {
            participants: values.participants.map((participant) => ({
              name: participant.name.trim(),
              ...(participant.userId ? { userId: participant.userId } : {}),
            })),
          }
        : {}),
    },
  };

  const response = await createGoalEndpoint(payload);

  if (!response.ok) {
    throw new Error('No se pudo crear la meta');
  }

  return (await response.json()) as CreateGoalResponse;
}

export function useCreateGoalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGoal,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
    },
  });
}
