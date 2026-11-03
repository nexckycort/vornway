import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';

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
  const currentUserId = (session as { user?: { id?: string | null } } | null)
    ?.user?.id;
  const groupsQuery = useInfiniteQuery(
    api.groups.list.infiniteQueryOptions({
      query: { limit: 20, filter: 'all' },
    }),
  );

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
        imageUrl: group.imageUrl,
        participantCount: group.participantCount,
        updatedAt: group.updatedAt,
      })),
    [groups],
  );

  const recentFriends = useMemo<ExpenseEntryFriend[]>(() => {
    const byIdentity = new Map<string, ExpenseEntryFriend>();

    for (const group of groups) {
      const currentMemberId = group.currentUser?.memberId;
      for (const member of group.members) {
        if (
          member.id === currentMemberId ||
          (currentUserId && member.userId === currentUserId)
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
            userId: member.userId,
            name: member.name,
            image: member.image,
            sharedGroupCount: 1,
            lastSeenAt: group.updatedAt,
          });
          continue;
        }

        const currentLastSeen = new Date(existing.lastSeenAt).getTime();
        const groupLastSeen = new Date(group.updatedAt).getTime();
        byIdentity.set(identity, {
          ...existing,
          image: existing.image ?? member.image,
          sharedGroupCount: existing.sharedGroupCount + 1,
          lastSeenAt:
            groupLastSeen > currentLastSeen
              ? group.updatedAt
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
  }, [currentUserId, groups]);

  return {
    groupsQuery,
    spaces,
    recentFriends,
    isLoading: groupsQuery.isLoading && groups.length === 0,
  };
}
