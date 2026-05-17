import { client } from '#/lib/hc';
import type { InferResponseType } from '#/lib/hc';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { GroupSummary } from '../$id/-types/group-detail.types';

const PAGE_LIMIT = 20;

const groupSummaryEndpoint = client.api.groups[':id'].$get;
const groupExpensesEndpoint = client.api.groups[':id'].expenses.$get;
const groupExpenseEndpoint = client.api.groups[':id'].expenses[':expenseId'].$get;

type GroupExpensesPageResponse = InferResponseType<typeof groupExpensesEndpoint>;
type GroupExpenseResponse = InferResponseType<typeof groupExpenseEndpoint>;
type GroupExpensesPageSuccess = Extract<
  GroupExpensesPageResponse,
  { data: unknown[]; pagination: { nextCursor: string | null } }
>;
type GroupExpenseSuccess = Extract<GroupExpenseResponse, { id: string }> & {
  category: { id: string; name: string } | null;
};

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

      return (await response.json()) as unknown as GroupSummary;
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

export function useGroupExpenseQuery(groupId: string, expenseId: string | undefined) {
  return useQuery({
    queryKey: ['group-expense', groupId, expenseId],
    enabled: Boolean(expenseId),
    queryFn: async () => {
      if (!expenseId) {
        throw new Error('Gasto no encontrado');
      }

      const response = await groupExpenseEndpoint({
        param: { id: groupId, expenseId },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo cargar el gasto');
      }

      return (await response.json()) as GroupExpenseSuccess;
    },
  });
}
