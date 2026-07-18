import { useQuery } from '@tanstack/react-query';
import { invitesClient } from '#/api/invites';

const invitePreviewEndpoint = invitesClient[':inviteCode'].$get;

export type InvitePreviewResponse = {
  group: {
    id: string;
    name: string;
    type: string;
    description: string | null;
    imageUrl: string | null;
    inviteCode: string;
    ownerName: string | null;
    memberCount: number;
  };
  unregisteredMembers: Array<{
    id: string;
    name: string;
  }>;
  alreadyMember: boolean;
};

export function useInvitePreviewQuery(inviteCode: string) {
  return useQuery({
    queryKey: ['invite-preview', inviteCode],
    enabled: inviteCode.trim().length > 0,
    queryFn: async () => {
      const response = await invitePreviewEndpoint({
        param: { inviteCode },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo cargar la invitación');
      }

      return (await response.json()) as InvitePreviewResponse;
    },
  });
}
