import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { groupsClient } from '#/api/groups';
import {
  GROUPS_LIST_REFRESH_EVENT,
  type GroupListFilter,
  type GroupsPage,
  upsertGroupListItems,
} from '#/lib/groups-list-query-collection';
import { m } from '#/paraglide/messages.js';

const PAGE_LIMIT = 20;

export type GroupListItem = GroupsPage['data'][number];

async function fetchGroupsPage({
  pageParam,
  search,
  filter,
}: {
  pageParam: string | null;
  search: string;
  filter: GroupListFilter;
}): Promise<GroupsPage> {
  const response = await groupsClient.index.$get({
    query: {
      limit: String(PAGE_LIMIT),
      ...(pageParam ? { cursor: pageParam } : {}),
      ...(search ? { search } : {}),
      filter,
    },
  });

  if (!response.ok) {
    throw new Error(m['groups.loadFailed']());
  }

  const page = (await response.json()) as GroupsPage;
  upsertGroupListItems(page.data);
  return page;
}

export function useGroupsInfiniteQuery(input: {
  search: string;
  filter: GroupListFilter;
}) {
  const search = input.search.trim();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleRefresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['groups-list'] });
    };

    window.addEventListener(GROUPS_LIST_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(GROUPS_LIST_REFRESH_EVENT, handleRefresh);
    };
  }, [queryClient]);

  return useInfiniteQuery({
    queryKey: ['groups-list', search, input.filter],
    queryFn: ({ pageParam }) =>
      fetchGroupsPage({ pageParam, search, filter: input.filter }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}
