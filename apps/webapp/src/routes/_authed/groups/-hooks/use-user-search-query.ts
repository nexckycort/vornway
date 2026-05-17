import { useQuery } from '@tanstack/react-query';

import { client } from '#/lib/hc';

export type UserSearchItem = {
  id: string;
  name: string;
  email: string;
  isCurrentUser: boolean;
};

type UserSearchResponse = {
  data: UserSearchItem[];
};

type UserSearchEndpoint = (args: {
  query: {
    query: string;
  };
}) => Promise<{
  ok: boolean;
  json: () => Promise<UserSearchResponse>;
}>;

const userSearchEndpoint = (client.api as unknown as {
  users: {
    search: {
      $get: UserSearchEndpoint;
    };
  };
}).users.search.$get;

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
