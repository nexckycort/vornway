import { useQuery } from '@tanstack/react-query';
import { api, withErrorMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export function useUserSearchQuery(query: string) {
  return useQuery({
    queryKey: ['users-search', query],
    enabled: query.trim().length > 0,
    queryFn: () =>
      withErrorMessage(
        api.users.search.request({ query: { query } }),
        m['system.searchUsersFailed'](),
      ),
  });
}
