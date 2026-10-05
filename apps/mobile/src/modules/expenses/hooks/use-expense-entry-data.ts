import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { groupsClient } from '@/api/groups';
import { authClient } from '@/lib/auth-client';

type GroupMember = {
  id: string;
  userId?: string | null;
  name: string;
  image?: string | null;
};

type Group = {
  id: string;
  name: string;
  imageUrl?: string | null;
  updatedAt?: string;
  participantCount?: number;
  members?: GroupMember[];
  currentUser?: { memberId?: string | null } | null;
};

type GroupsPage = {
  data: Group[];
  pagination?: { nextCursor?: string | null };
};

export type ExpenseEntrySpace = {
  id: string;
  name: string;
  imageUrl: string | null;
  participantCount: number;
  updatedAt: string;
};

export type ExpenseEntryFriend = {
  id: string;
  userId: string | null;
  name: string;
  image: string | null;
  sharedGroupCount: number;
  lastSeenAt: string;
};

export function useExpenseEntryData() {
  const { data: session } = authClient.useSession();
  const currentUser = (session as { user?: { id?: string | null } } | null)
    ?.user;
  const groupsQuery = useInfiniteQuery({
    queryKey: ['expense-entry-groups'],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await groupsClient.index.$get({
        query: {
          limit: '20',
          filter: 'all',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      if (!response.ok) throw new Error('groups_load_failed');
      return (await response.json()) as unknown as GroupsPage;
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
  });

  useEffect(() => {
    if (!groupsQuery.hasNextPage || groupsQuery.isFetchingNextPage) return;
    void groupsQuery.fetchNextPage();
  }, [
    groupsQuery.fetchNextPage,
    groupsQuery.hasNextPage,
    groupsQuery.isFetchingNextPage,
  ]);

  const groups = groupsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const spaces = useMemo<ExpenseEntrySpace[]>(
    () =>
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        imageUrl: group.imageUrl ?? null,
        participantCount: group.participantCount ?? group.members?.length ?? 0,
        updatedAt: group.updatedAt ?? '',
      })),
    [groups],
  );

  const recentFriends = useMemo<ExpenseEntryFriend[]>(() => {
    const byIdentity = new Map<string, ExpenseEntryFriend>();

    for (const group of groups) {
      const currentMemberId = group.currentUser?.memberId ?? null;
      for (const member of group.members ?? []) {
        if (
          member.id === currentMemberId ||
          (currentUser?.id && member.userId === currentUser.id)
        ) {
          continue;
        }

        const identity = member.userId
          ? `user:${member.userId}`
          : `manual:${member.name.trim().toLocaleLowerCase('es-CO')}`;
        const existing = byIdentity.get(identity);
        if (!existing) {
          byIdentity.set(identity, {
            id: member.id,
            userId: member.userId ?? null,
            name: member.name,
            image: member.image ?? null,
            sharedGroupCount: 1,
            lastSeenAt: group.updatedAt ?? '',
          });
          continue;
        }

        const currentLastSeen = new Date(existing.lastSeenAt).getTime();
        const groupLastSeen = new Date(group.updatedAt ?? '').getTime();
        byIdentity.set(identity, {
          ...existing,
          image: existing.image ?? member.image ?? null,
          sharedGroupCount: existing.sharedGroupCount + 1,
          lastSeenAt:
            groupLastSeen > currentLastSeen
              ? (group.updatedAt ?? existing.lastSeenAt)
              : existing.lastSeenAt,
        });
      }
    }

    return [...byIdentity.values()].sort((left, right) => {
      const dateDiff =
        new Date(right.lastSeenAt).getTime() -
        new Date(left.lastSeenAt).getTime();
      return dateDiff !== 0 ? dateDiff : left.name.localeCompare(right.name);
    });
  }, [currentUser?.id, groups]);

  return {
    groupsQuery,
    spaces,
    recentFriends,
    isLoading: groupsQuery.isLoading && groups.length === 0,
  };
}
