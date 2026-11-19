import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export function useRemoveGoalMemberMutation(goalId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) =>
      withErrorMessage(
        api.goals.removeMember.request({
          params: { id: goalId, memberId },
        }),
        m['groups.detail.removeMemberFailed'](),
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['goal-detail', goalId] }),
        queryClient.invalidateQueries({ queryKey: ['goals-list'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]),
  });
}
