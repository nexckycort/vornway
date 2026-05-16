import { API_URL } from '#/config/env';
import { useInfiniteQuery } from '@tanstack/react-query';

const PAGE_LIMIT = 20;

export type GroupListItem = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  totals: Record<string, number>;
  myMembership: {
    id: string;
    name: string;
    role: string;
  } | null;
};

export type GroupsPage = {
  data: GroupListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

async function fetchGroupsPage({
  pageParam,
}: {
  pageParam: string | null;
}): Promise<GroupsPage> {
  const params = new URLSearchParams({
    limit: String(PAGE_LIMIT),
  });

  if (pageParam) {
    params.set('cursor', pageParam);
  }

  const response = await fetch(`${API_URL}/api/groups?${params.toString()}`, {
    credentials: 'include',
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
