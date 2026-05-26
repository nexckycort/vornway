import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from '#/lib/hc';
import { client } from '#/lib/hc';

const createGoalEndpoint = client.api.goals.$post;

type CreateGoalRequest = InferRequestType<typeof createGoalEndpoint>;
type CreateGoalResponse = InferResponseType<typeof createGoalEndpoint>;

export type CreateGoalFormValues = {
  name: string;
  description: string;
  goalType: 'trip' | 'gift' | 'saving' | 'event' | 'custom';
  emoji: string;
  coverImageUrl?: string | null;
  themeColor: string;
  contributionMode: 'manual' | 'monthly' | 'flexible' | 'suggested';
  currency: string;
  targetAmount: string;
  startDate: string;
  endDate: string;
  installmentCount: string;
  installmentAmount: string;
  suggestedContributionAmount: string;
  participants: Array<{
    name: string;
    userId?: string;
  }>;
};

async function createGoal(
  values: CreateGoalFormValues,
): Promise<CreateGoalResponse> {
  const payload: CreateGoalRequest = {
    json: {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      goalType: values.goalType,
      emoji: values.emoji.trim() || undefined,
      coverImageUrl: values.coverImageUrl || undefined,
      themeColor: values.themeColor,
      contributionMode: values.contributionMode,
      currency: values.currency.trim().toUpperCase(),
      targetAmount: Number(values.targetAmount),
      startDate: values.startDate,
      endDate: values.endDate,
      installmentCount: Number(values.installmentCount),
      ...(values.installmentAmount.trim()
        ? { installmentAmount: Number(values.installmentAmount) }
        : {}),
      ...(values.suggestedContributionAmount.trim()
        ? {
            suggestedContributionAmount: Number(
              values.suggestedContributionAmount,
            ),
          }
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
