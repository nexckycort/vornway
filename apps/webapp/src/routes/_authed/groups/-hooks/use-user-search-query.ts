import { useQuery } from '@tanstack/react-query';
import { usersClient } from '#/api/users';
import { m } from '#/paraglide/messages.js';

const userSearchEndpoint = usersClient.search.$get;

export function useUserSearchQuery(query: string) {
  return useQuery({
    queryKey: ['users-search', query],
    enabled: query.trim().length > 0,
    queryFn: async () => {
      const response = await userSearchEndpoint({
        query: { query },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? m['system.searchUsersFailed']());
      }

      return await response.json();
    },
  });
}
