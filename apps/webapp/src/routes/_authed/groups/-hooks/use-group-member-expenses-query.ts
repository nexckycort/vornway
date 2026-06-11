import { useInfiniteQuery } from '@tanstack/react-query';

import { client, type InferResponseType } from '#/lib/hc';

const PAGE_LIMIT = 20;
const groupMemberExpensesEndpoint =
  client.api.groups[':id'].members[':memberId'].expenses.$get;

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
  };
};

export function useGroupMemberExpensesInfiniteQuery(
  groupId: string,
  memberId: string,
  filter?: {
    categoryId?: string;
    uncategorized?: boolean;
    startDate?: string;
    endDate?: string;
  },
) {
  return useInfiniteQuery({
    queryKey: [
      'group-member-expenses',
      groupId,
      memberId,
      filter?.categoryId ?? null,
      filter?.uncategorized ?? false,
      filter?.startDate ?? null,
      filter?.endDate ?? null,
    ],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await groupMemberExpensesEndpoint({
        param: { id: groupId, memberId },
        query: {
          limit: String(PAGE_LIMIT),
          ...(filter?.categoryId ? { categoryId: filter.categoryId } : {}),
          ...(filter?.uncategorized ? { uncategorized: 'true' } : {}),
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
