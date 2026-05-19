import type { InferResponseType } from '#/lib/hc';
import { client } from '#/lib/hc';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_LIMIT = 20;

const listGroupsEndpoint = client.api.groups.$get;
export type GroupsPage = InferResponseType<typeof listGroupsEndpoint>;
export type GroupListItem = GroupsPage['data'][number];
export type GroupListFilter = 'all' | 'theyOweYou' | 'youOweThem' | 'noDebt';

async function fetchGroupsPage({
  pageParam,
  search,
  filter,
}: {
  pageParam: string | null;
  search: string;
  filter: GroupListFilter;
}): Promise<GroupsPage> {
  const response = await client.api.groups.$get({
    query: {
      limit: String(PAGE_LIMIT),
      ...(pageParam ? { cursor: pageParam } : {}),
      ...(search ? { search } : {}),
      filter,
    },
  });

  if (!response.ok) {
    throw new Error('No se pudieron cargar los grupos');
  }

  return (await response.json()) as GroupsPage;
}

export function useGroupsInfiniteQuery(input: {
  search: string;
  filter: GroupListFilter;
}) {
  const search = input.search.trim();

  return useInfiniteQuery({
    queryKey: ['groups-list', search, input.filter],
    queryFn: ({ pageParam }) =>
      fetchGroupsPage({ pageParam, search, filter: input.filter }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}
