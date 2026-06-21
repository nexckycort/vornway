import { useQuery } from '@tanstack/react-query';
import { usersClient } from '#/api/users';

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
        throw new Error(payload.error ?? 'No se pudo buscar usuarios');
      }

      return await response.json();
    },
  });
}
