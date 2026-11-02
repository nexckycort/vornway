import { useQuery } from '@tanstack/react-query';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export function useGroupMemberSearchQuery(groupId: string, query: string) {
  return useQuery({
    queryKey: ['group-member-search', groupId, query],
    enabled: query.trim().length > 0,
    queryFn: () =>
      withErrorMessage(
        api.groups.searchMembers.request({
          params: { id: groupId },
          query: { query },
        }),
        m['system.searchUsersFailed'](),
      ),
  });
}
