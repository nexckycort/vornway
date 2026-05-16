import { client } from '#/lib/hc';
import type { InferResponseType } from '#/lib/hc';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

const PAGE_LIMIT = 20;

const groupSummaryEndpoint = client.api.groups[':id'].$get;
const groupExpensesEndpoint = client.api.groups[':id'].expenses.$get;

type GroupSummaryResponse = InferResponseType<typeof groupSummaryEndpoint>;
type GroupExpensesPageResponse = InferResponseType<typeof groupExpensesEndpoint>;
type GroupSummarySuccess = Extract<GroupSummaryResponse, { id: string }>;
type GroupExpensesPageSuccess = Extract<
  GroupExpensesPageResponse,
  { data: unknown[]; pagination: { nextCursor: string | null } }
>;

export function useGroupSummaryQuery(groupId: string) {
  return useQuery({
    queryKey: ['group-summary', groupId],
    queryFn: async () => {
      const response = await groupSummaryEndpoint({
        param: { id: groupId },
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar el grupo');
      }

      return (await response.json()) as GroupSummarySuccess;
    },
  });
}

export function useGroupExpensesInfiniteQuery(groupId: string) {
  return useInfiniteQuery({
    queryKey: ['group-expenses', groupId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await groupExpensesEndpoint({
        param: { id: groupId },
        query: {
          limit: String(PAGE_LIMIT),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar los gastos');
      }

      return (await response.json()) as GroupExpensesPageSuccess;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}
