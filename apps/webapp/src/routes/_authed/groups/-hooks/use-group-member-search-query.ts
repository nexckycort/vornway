import { useQuery } from '@tanstack/react-query';
import { groupsClient } from '#/api/groups';
import type { InferResponseType } from '#/api/types';
import { m } from '#/paraglide/messages.js';

const groupMemberSearchEndpoint = groupsClient[':id'].members.search.$get;

type GroupMemberSearchResponse = InferResponseType<
  typeof groupMemberSearchEndpoint
>;
type GroupMemberSearchSuccess = Extract<
  GroupMemberSearchResponse,
  { data: unknown[] }
>;

export function useGroupMemberSearchQuery(groupId: string, query: string) {
  return useQuery({
    queryKey: ['group-member-search', groupId, query],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const response = await groupMemberSearchEndpoint({
        param: { id: groupId },
        query: { query },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? m['system.searchUsersFailed']());
      }

      return (await response.json()) as GroupMemberSearchSuccess;
    },
  });
}
