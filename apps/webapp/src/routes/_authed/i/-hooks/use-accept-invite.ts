import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invitesClient } from '#/api/invites';

const acceptInviteEndpoint = invitesClient[':inviteCode'].accept.$post;

export type AcceptInviteResponse = {
  groupId: string;
  groupType: string;
  memberId: string;
};

export function useAcceptInvite(inviteCode: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { memberId?: string }) => {
      const response = await acceptInviteEndpoint({
        param: { inviteCode },
        json: input,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo aceptar la invitación');
      }

      return (await response.json()) as AcceptInviteResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups-list'] });
      await queryClient.invalidateQueries({ queryKey: ['home-summary'] });
    },
  });
}
