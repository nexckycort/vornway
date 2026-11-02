import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

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

function createGoal(values: CreateGoalFormValues) {
  return failWithMessage(
    api.goals.create.request({
      payload: {
        name: values.name.trim(),
        ...(values.description.trim()
          ? { description: values.description.trim() }
          : {}),
        goalType: values.goalType,
        ...(values.emoji.trim() ? { emoji: values.emoji.trim() } : {}),
        ...(values.coverImageUrl
          ? { coverImageUrl: values.coverImageUrl }
          : {}),
        themeColor: values.themeColor,
        contributionMode: values.contributionMode,
        currency: values.currency.trim().toUpperCase(),
        targetAmount: Number(values.targetAmount),
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
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
    }),
    m['system.createGoalFailed'](),
  );
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
