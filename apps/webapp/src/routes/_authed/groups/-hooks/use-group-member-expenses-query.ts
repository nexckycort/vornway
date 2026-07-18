import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { groupsClient } from '#/api/groups';

import type { InferResponseType } from '#/api/types';

const PAGE_LIMIT = 20;
const MULTI_MEMBER_LIMIT = 100;
const groupMemberExpensesEndpoint =
  groupsClient[':id'].members[':memberId'].expenses.$get;

type GroupMemberExpensesPageResponse = InferResponseType<
  typeof groupMemberExpensesEndpoint
>;

export type GroupMemberExpenseItem = Extract<
  GroupMemberExpensesPageResponse,
  { data: unknown[]; pagination: { nextCursor: string | null } }
>['data'][number];

type GroupMemberExpensesPageBase = Extract<
  GroupMemberExpensesPageResponse,
  { data: unknown[]; pagination: { nextCursor: string | null } }
>;

type GroupMemberExpensesPageSuccess = GroupMemberExpensesPageBase & {
  summary: {
    spentByCurrency: Record<string, number>;
    grossPaidByCurrency: Record<string, number>;
  };
};

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
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      if (!memberId) {
        throw new Error('Participante no encontrado');
      }

      const response = await groupMemberExpensesEndpoint({
        param: { id: groupId, memberId },
        query: {
          limit: String(PAGE_LIMIT),
          ...(filter?.categoryId ? { categoryId: filter.categoryId } : {}),
          ...(filter?.uncategorized ? { uncategorized: 'true' } : {}),
          ...(filter?.paidOnly ? { paidOnly: 'true' } : {}),
          ...(filter?.startDate ? { startDate: filter.startDate } : {}),
          ...(filter?.endDate ? { endDate: filter.endDate } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar los gastos del participante');
      }

      return (await response.json()) as GroupMemberExpensesPageSuccess;
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
      queryFn: async () => {
        const response = await groupMemberExpensesEndpoint({
          param: { id: groupId, memberId },
          query: {
            limit: String(MULTI_MEMBER_LIMIT),
            ...(filter?.categoryId ? { categoryId: filter.categoryId } : {}),
            ...(filter?.uncategorized ? { uncategorized: 'true' } : {}),
            ...(filter?.paidOnly ? { paidOnly: 'true' } : {}),
            ...(filter?.startDate ? { startDate: filter.startDate } : {}),
            ...(filter?.endDate ? { endDate: filter.endDate } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar los gastos del participante');
        }

        return (await response.json()) as GroupMemberExpensesPageSuccess;
      },
    })),
  });
}
