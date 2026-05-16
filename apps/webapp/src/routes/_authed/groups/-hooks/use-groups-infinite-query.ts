import { client } from '#/lib/hc';
import type { InferResponseType } from '#/lib/hc';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_LIMIT = 20;

const listGroupsEndpoint = client.api.groups.$get;
export type GroupsPage = InferResponseType<typeof listGroupsEndpoint>;
export type GroupListItem = GroupsPage['data'][number];

async function fetchGroupsPage({
  pageParam,
}: {
  pageParam: string | null;
}): Promise<GroupsPage> {
  const response = await client.api.groups.$get({
    query: {
      limit: String(PAGE_LIMIT),
      ...(pageParam ? { cursor: pageParam } : {}),
    },
  });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los grupos');
  }

  return (await response.json()) as GroupsPage;
}

export function useGroupsInfiniteQuery() {
  return useInfiniteQuery({
    queryKey: ['groups-list'],
    queryFn: ({ pageParam }) => fetchGroupsPage({ pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}
