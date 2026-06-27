import { useMemo } from 'react';
import { getCachedGroupListItems } from '#/lib/groups-list-query-collection';
import { useGroupsInfiniteQuery } from '#/routes/_authed/groups/-hooks/use-groups-infinite-query';

export type ExpenseEntrySpace = {
  id: string;
  name: string;
  imageUrl: string | null;
  participantCount: number;
  updatedAt: string;
};

export type ExpenseEntryFriend = {
  id: string;
  name: string;
  image: string | null;
  sharedGroupCount: number;
  lastSeenAt: string;
};

function toRecentSpaces() {
  return getCachedGroupListItems()
    .slice()
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    );
}

export function useExpenseEntryData() {
  const groupsQuery = useGroupsInfiniteQuery({
    search: '',
    filter: 'all',
  });

  const groups = useMemo(() => {
    const serverGroups =
      groupsQuery.data?.pages.flatMap((page) => page.data) ?? null;

    return (serverGroups ?? toRecentSpaces()).map((group) => ({
      id: group.id,
      name: group.name,
      imageUrl: group.imageUrl,
      participantCount: group.participantCount,
      updatedAt: group.updatedAt,
      members: group.members,
      currentUser: group.currentUser,
    }));
  }, [groupsQuery.data]);

  const spaces = useMemo(
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

  const recentFriends = useMemo(() => {
    const byId = new Map<string, ExpenseEntryFriend>();

    for (const group of groups) {
      const currentMemberId = group.currentUser?.memberId ?? null;

      for (const member of group.members) {
        if (member.id === currentMemberId) {
          continue;
        }

        const existing = byId.get(member.id);
        if (!existing) {
          byId.set(member.id, {
            id: member.id,
            name: member.name,
            image: member.image,
            sharedGroupCount: 1,
            lastSeenAt: group.updatedAt,
          });
          continue;
        }

        byId.set(member.id, {
          ...existing,
          sharedGroupCount: existing.sharedGroupCount + 1,
          lastSeenAt:
            new Date(group.updatedAt).getTime() >
            new Date(existing.lastSeenAt).getTime()
              ? group.updatedAt
              : existing.lastSeenAt,
        });
      }
    }

    return Array.from(byId.values()).sort((left, right) => {
      const dateDiff =
        new Date(right.lastSeenAt).getTime() -
        new Date(left.lastSeenAt).getTime();
      if (dateDiff !== 0) return dateDiff;
      return left.name.localeCompare(right.name);
    });
  }, [groups]);

  return {
    spaces,
    recentFriends,
    isLoading: groupsQuery.isLoading && groups.length === 0,
  };
}
