import { useQuery } from '@tanstack/react-query';
import type { ApiSuccess } from '@vornway/api-client';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export type InvitePreviewResponse = ApiSuccess<'invites', 'preview'>;

export function useInvitePreviewQuery(inviteCode: string) {
  return useQuery({
    queryKey: ['invite-preview', inviteCode],
    enabled: inviteCode.trim().length > 0,
    queryFn: () =>
      withErrorMessage(
        api.invites.preview.request({ params: { inviteCode } }),
        m['invite.loadFailed'](),
      ),
  });
}
