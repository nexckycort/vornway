import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiPayload } from '@vornway/api-client';
import { api, withErrorMessage } from '@/lib/api';

export function useGoalMutations(id: string, groupId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: api.goals.key() }),
      queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
  const params = { id };

  const addMember = useMutation({
    onSuccess: invalidate,
    mutationFn: (member: { name: string; linkedUserId?: string }) => {
      if (!groupId) throw new Error('group_missing');
      return withErrorMessage(
        api.groups.addMember.request({
          params: { id: groupId },
          payload: member,
        }),
        'member_add_failed',
      );
    },
  });
  const update = useMutation({
    onSuccess: invalidate,
    mutationFn: (payload: ApiPayload<'goals', 'update'>) =>
      withErrorMessage(
        api.goals.update.request({ params, payload }),
        'goal_update_failed',
      ),
  });
  const contribution = useMutation({
    onSuccess: invalidate,
    mutationFn: (payload: ApiPayload<'goals', 'addContribution'>) =>
      withErrorMessage(
        api.goals.addContribution.request({ params, payload }),
        'goal_contribution_failed',
      ),
  });
  const deleteContribution = useMutation({
    onSuccess: invalidate,
    mutationFn: (contributionId: string) =>
      withErrorMessage(
        api.goals.deleteContribution.request({
          params: { id, contributionId },
        }),
        'goal_contribution_delete_failed',
      ),
  });

  return { addMember, update, contribution, deleteContribution };
}
