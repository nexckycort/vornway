import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import type { ApiSuccess, Cursor } from '@vornway/api-client';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

const PAGE_LIMIT = 20;
const MULTI_MEMBER_LIMIT = 100;

type GroupMemberExpensesPage = ApiSuccess<'groups', 'listMemberExpenses'>;

export type GroupMemberExpenseItem = GroupMemberExpensesPage['data'][number];

type GroupMemberExpensesFilter = {
  categoryId?: string;
  uncategorized?: boolean;
  paidOnly?: boolean;
  startDate?: string;
  endDate?: string;
  enabled?: boolean;
};

export function useGroupMemberExpensesInfiniteQuery(
  groupId: string,
  memberId: string | undefined,
  filter?: GroupMemberExpensesFilter,
) {
  return useInfiniteQuery({
    queryKey: [
      'group-member-expenses',
      groupId,
      memberId,
      filter?.categoryId ?? null,
      filter?.uncategorized ?? false,
      filter?.paidOnly ?? false,
      filter?.startDate ?? null,
      filter?.endDate ?? null,
    ],
    enabled: Boolean(memberId) && (filter?.enabled ?? true),
    initialPageParam: null as Cursor | null,
    queryFn: async ({ pageParam }) => {
      if (!memberId) {
        throw new Error(m['groups.detail.memberMissing']());
      }

      return failWithMessage(
        api.groups.listMemberExpenses.request({
          params: { id: groupId, memberId },
          query: {
            limit: PAGE_LIMIT,
            ...memberExpensesFilterQuery(filter),
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        }),
        m['system.loadMemberExpensesFailed'](),
      );
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}

export function useGroupMemberExpensesByMembersQuery(
  groupId: string,
  memberIds: string[],
  filter?: GroupMemberExpensesFilter,
) {
  const stableMemberIds = Array.from(new Set(memberIds)).sort();

  return useQueries({
    queries: stableMemberIds.map((memberId) => ({
      queryKey: [
        'group-member-expenses-list',
        groupId,
        memberId,
        filter?.categoryId ?? null,
        filter?.uncategorized ?? false,
        filter?.paidOnly ?? false,
        filter?.startDate ?? null,
        filter?.endDate ?? null,
      ],
      enabled: filter?.enabled ?? true,
      queryFn: () =>
        failWithMessage(
          api.groups.listMemberExpenses.request({
            params: { id: groupId, memberId },
            query: {
              limit: MULTI_MEMBER_LIMIT,
              ...memberExpensesFilterQuery(filter),
            },
          }),
          m['system.loadMemberExpensesFailed'](),
        ),
    })),
  });
}

function memberExpensesFilterQuery(filter?: GroupMemberExpensesFilter) {
  return {
    ...(filter?.categoryId ? { categoryId: filter.categoryId } : {}),
    ...(filter?.uncategorized ? { uncategorized: true } : {}),
    ...(filter?.paidOnly ? { paidOnly: true } : {}),
    ...(filter?.startDate ? { startDate: filter.startDate } : {}),
    ...(filter?.endDate ? { endDate: filter.endDate } : {}),
  };
}
