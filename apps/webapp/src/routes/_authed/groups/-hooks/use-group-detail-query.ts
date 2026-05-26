import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  GROUPS_LIST_REFRESH_EVENT,
  getCachedGroupSummary,
  upsertCachedGroupSummary,
} from '#/lib/groups-list-query-collection';
import type { InferResponseType } from '#/lib/hc';
import { client } from '#/lib/hc';
import {
  getLocalGroupById,
  type PendingGroup,
  removeLocalGroupFallback,
} from '#/lib/offline-group-query-collection';
import type {
  ExpenseItem,
  GroupSummary,
} from '../$id/-types/group-detail.types';

const PAGE_LIMIT = 20;

const groupSummaryEndpoint = client.api.groups[':id'].$get;
const groupExpensesEndpoint = client.api.groups[':id'].expenses.$get;
const groupExpenseEndpoint =
  client.api.groups[':id'].expenses[':expenseId'].$get;
const groupReportsTotalsEndpoint = client.api.groups[':id'].reports.totals.$get;

function buildPendingGroupSummary(group: PendingGroup): GroupSummary {
  const ownerMemberId = `${group.id}:owner`;
  const participantMembers = (group.payload.participants ?? []).map(
    (participant, index) => ({
      id: `${group.id}:participant:${index}`,
      name: participant.name,
      email: null,
      image: null,
      role: 'member',
      userId: participant.userId ?? null,
      isCurrentUser: false,
      expenseCount: 0,
    }),
  );

  return {
    id: group.id,
    name: group.payload.name,
    type: group.payload.type,
    description: group.payload.description ?? null,
    imageUrl: null,
    inviteCode: '',
    ownerId: '',
    createdAt: group.createdAt,
    updatedAt: group.createdAt,
    advancedExpenseDetailsEnabled: false,
    participantCount: participantMembers.length + 1,
    totals: {},
    categories: [],
    members: [
      {
        id: ownerMemberId,
        name: 'Tú',
        email: null,
        image: null,
        role: 'admin',
        userId: null,
        isCurrentUser: true,
        expenseCount: 0,
      },
      ...participantMembers,
    ],
    directDebts: [],
    directCredits: [],
    memberBalances: [],
    settlementDebts: [],
    myMembership: {
      id: ownerMemberId,
      name: 'Tú',
      role: 'admin',
    },
    isOwner: true,
  };
}

type GroupExpensesPageResponse = InferResponseType<
  typeof groupExpensesEndpoint
>;
type GroupExpenseResponse = InferResponseType<typeof groupExpenseEndpoint>;
type GroupExpensesPageSuccess = Extract<
  GroupExpensesPageResponse,
  { data: unknown[]; pagination: { nextCursor: string | null } }
>;
type GroupExpenseSuccess = Extract<GroupExpenseResponse, { id: string }>;
type GroupReportsTotalsSuccess = {
  range: 'all' | 7 | 15 | 30;
  totalsByCurrency: Record<string, number>;
  expenseCountByCurrency: Record<string, number>;
  currentUserSpentByCurrency: Record<string, number>;
  categoriesByCurrency: Record<
    string,
    Array<{
      name: string;
      icon: string | null;
      expenseCount: number;
      amount: number;
      fill: string;
    }>
  >;
};

function mapExpenseDetailToExpenseItem(
  expense: GroupExpenseSuccess,
): ExpenseItem {
  const paidByMembers =
    (
      expense as GroupExpenseSuccess & {
        paidByMembers?: ExpenseItem['paidByMembers'];
      }
    ).paidByMembers ?? [];

  return {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    date: expense.date,
    isDeleted: expense.isDeleted ?? false,
    isSettlement: expense.isSettlement ?? false,
    isPersonal: false,
    expenseType: 'standard',
    subExpenseCount: 0,
    settlementToName: null,
    paidBy: expense.paidBy,
    paidByMembers,
    category: expense.category ?? null,
    participantCount: expense.participants?.length ?? 0,
    currentUserBalance: null,
    attachmentUrl: expense.attachmentUrl ?? null,
  };
}

export function useGroupSummaryQuery(groupId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleRefresh = () => {
      void queryClient.invalidateQueries({
        queryKey: ['group-summary', groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['group-expenses', groupId],
      });
    };

    window.addEventListener(GROUPS_LIST_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(GROUPS_LIST_REFRESH_EVENT, handleRefresh);
    };
  }, [groupId, queryClient]);

  return useQuery({
    queryKey: ['group-summary', groupId],
    initialData: () => {
      const localGroup = getLocalGroupById(groupId);
      if (localGroup) {
        return buildPendingGroupSummary(localGroup);
      }

      return getCachedGroupSummary(groupId) ?? undefined;
    },
    queryFn: async () => {
      const localGroup = getLocalGroupById(groupId);
      const cachedGroup = getCachedGroupSummary(groupId);
      if (localGroup && typeof navigator !== 'undefined' && !navigator.onLine) {
        return buildPendingGroupSummary(localGroup);
      }

      if (
        cachedGroup &&
        typeof navigator !== 'undefined' &&
        !navigator.onLine
      ) {
        return cachedGroup;
      }

      let response: Awaited<ReturnType<typeof groupSummaryEndpoint>>;
      try {
        response = await groupSummaryEndpoint({
          param: { id: groupId },
        });
      } catch {
        if (localGroup) {
          return buildPendingGroupSummary(localGroup);
        }

        if (cachedGroup) {
          return cachedGroup;
        }

        throw new Error('No se pudo cargar el grupo');
      }

      if (!response.ok) {
        if (localGroup) {
          return buildPendingGroupSummary(localGroup);
        }

        if (cachedGroup) {
          return cachedGroup;
        }

        throw new Error('No se pudo cargar el grupo');
      }

      const group = (await response.json()) as unknown as GroupSummary;
      removeLocalGroupFallback(groupId);
      upsertCachedGroupSummary(group);
      return group;
    },
  });
}

export function useGroupExpensesInfiniteQuery(groupId: string) {
  return useInfiniteQuery({
    queryKey: ['group-expenses', groupId],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let response: Awaited<ReturnType<typeof groupExpensesEndpoint>>;
      try {
        response = await groupExpensesEndpoint({
          param: { id: groupId },
          query: {
            limit: String(PAGE_LIMIT),
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        });
      } catch {
        return {
          data: [],
          pagination: { limit: PAGE_LIMIT, total: 0, nextCursor: null },
        } as GroupExpensesPageSuccess;
      }

      if (!response.ok) {
        return {
          data: [],
          pagination: { limit: PAGE_LIMIT, total: 0, nextCursor: null },
        } as GroupExpensesPageSuccess;
      }

      return (await response.json()) as GroupExpensesPageSuccess;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
  });
}

export function useGroupExpenseQuery(
  groupId: string,
  expenseId: string | undefined,
) {
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

export function usePinnedGroupExpensesQuery(
  groupId: string,
  pinnedExpenseIds: string[],
) {
  const stableIds = [...new Set(pinnedExpenseIds)].sort();

  return useQuery({
    queryKey: ['group-pinned-expenses', groupId, stableIds],
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(
        stableIds.map(async (expenseId) => {
          const response = await groupExpenseEndpoint({
            param: { id: groupId, expenseId },
          });

          if (!response.ok) return null;

          const payload = (await response.json()) as GroupExpenseSuccess;
          return mapExpenseDetailToExpenseItem(payload);
        }),
      );

      return results
        .filter(
          (result): result is PromiseFulfilledResult<ExpenseItem | null> =>
            result.status === 'fulfilled',
        )
        .map((result) => result.value)
        .filter((expense): expense is ExpenseItem => expense !== null);
    },
    staleTime: 30_000,
  });
}

export function useGroupReportsTotalsQuery(
  groupId: string,
  range: 'all' | 7 | 15 | 30,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['group-reports-totals', groupId, range],
    enabled,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const response = await groupReportsTotalsEndpoint({
        param: { id: groupId },
        query: {
          range: String(range),
        },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar los totales');
      }

      return (await response.json()) as GroupReportsTotalsSuccess;
    },
  });
}
