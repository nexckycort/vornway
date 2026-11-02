import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiSuccess } from '@vornway/api-client';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type AcceptInviteResponse = ApiSuccess<'invites', 'accept'>;

export function useAcceptInvite(inviteCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { memberId?: string }) =>
      withErrorMessage(
        api.invites.accept.request({ params: { inviteCode }, payload }),
        m['invite.acceptFailed'](),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups-list'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
}
