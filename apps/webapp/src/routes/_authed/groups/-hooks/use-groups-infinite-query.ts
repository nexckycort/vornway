import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Cursor } from '@vornway/api-client';
import { useEffect } from 'react';
import { api, failWithMessage } from '#/api/client';
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
  pageParam: Cursor | null;
  search: string;
  filter: GroupListFilter;
}): Promise<GroupsPage> {
  const page = await failWithMessage(
    api.groups.list.request({
      query: {
        limit: PAGE_LIMIT,
        ...(pageParam ? { cursor: pageParam } : {}),
        ...(search ? { search } : {}),
        filter,
      },
    }),
    m['groups.loadFailed'](),
  );
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
    initialPageParam: null as Cursor | null,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}
