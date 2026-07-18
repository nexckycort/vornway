import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';
import { groupsClient } from '#/api/groups';
import type { InferResponseType } from '#/api/types';
import {
  type GroupExpensesPageSuccess,
  getCachedGroupExpensesPage,
  upsertCachedGroupExpensesPage,
} from '#/lib/group-expenses-query-collection';
import {
  GROUPS_LIST_REFRESH_EVENT,
  getCachedGroupSummary,
  upsertCachedGroupSummary,
} from '#/lib/groups-list-query-collection';
import {
  getLocalGroupById,
  type PendingGroup,
  removeLocalGroupFallback,
} from '#/lib/offline-group-query-collection';
import { m } from '#/paraglide/messages.js';
import type {
  ExpenseItem,
  GroupSummary,
} from '../$id/-types/group-detail.types';

const PAGE_LIMIT = 20;

const groupSummaryEndpoint = groupsClient[':id'].$get;
const groupExpensesEndpoint = groupsClient[':id'].expenses.$get;
const groupExpenseEndpoint = groupsClient[':id'].expenses[':expenseId'].$get;
const groupReportsTotalsEndpoint = groupsClient[':id'].reports.totals.$get;
const groupReportsCategoryCountEndpoint =
  groupsClient[':id'].reports['category-count'].$get;
const groupReportsBalancesEndpoint = groupsClient[':id'].reports.balances.$get;
const groupReportsSharesEndpoint = groupsClient[':id'].reports.shares.$get;

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
        name: m['common.user.you'](),
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
      name: m['common.user.you'](),
      role: 'admin',
    },
    isOwner: true,
  };
}

type GroupExpenseResponse = InferResponseType<typeof groupExpenseEndpoint>;
type GroupExpenseSuccess = Extract<GroupExpenseResponse, { id: string }>;
type GroupReportsTotalsSuccess = {
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  totalsByCurrency: Record<string, number>;
  expenseCountByCurrency: Record<string, number>;
  currentUserSpentByCurrency: Record<string, number>;
  categoriesByCurrency: Record<
    string,
    Array<{
      key: string;
      id: string | null;
      name: string;
      icon: string | null;
      expenseCount: number;
      amount: number;
      fill: string;
    }>
  >;
};

type GroupReportsBalancesSuccess = {
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  memberBalances: Array<{
    memberId: string;
    name: string;
    isCurrentUser: boolean;
    balances: Record<string, number>;
  }>;
};

type GroupReportsCategoryCountSuccess = {
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  expenseCount: number;
};

type GroupReportsSharesSuccess = {
  range: 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  memberShares: Array<{
    memberId: string;
    name: string;
    isCurrentUser: boolean;
    shares: Record<string, number>;
    categorySharesByCurrency: Record<string, Record<string, number>>;
  }>;
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

        throw new Error(m['system.loadGroupFailed']());
      }

      if (!response.ok) {
        if (localGroup) {
          return buildPendingGroupSummary(localGroup);
        }

        if (cachedGroup) {
          return cachedGroup;
        }

        throw new Error(m['system.loadGroupFailed']());
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
      const cachedPage = await getCachedGroupExpensesPage(groupId, pageParam);
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return (
          cachedPage ??
          ({
            data: [],
            pagination: { limit: PAGE_LIMIT, total: 0, nextCursor: null },
          } as GroupExpensesPageSuccess)
        );
      }

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
        return (
          cachedPage ??
          ({
            data: [],
            pagination: { limit: PAGE_LIMIT, total: 0, nextCursor: null },
          } as GroupExpensesPageSuccess)
        );
      }

      if (!response.ok) {
        return (
          cachedPage ??
          ({
            data: [],
            pagination: { limit: PAGE_LIMIT, total: 0, nextCursor: null },
          } as GroupExpensesPageSuccess)
        );
      }

      const page = (await response.json()) as GroupExpensesPageSuccess;
      await upsertCachedGroupExpensesPage(groupId, pageParam, page);
      return page;
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
        throw new Error(m['system.expenseNotFound']());
      }

      const response = await groupExpenseEndpoint({
        param: { id: groupId, expenseId },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? m['system.loadExpenseFailed']());
      }

      return (await response.json()) as GroupExpenseSuccess;
    },
  });
}

export function usePinnedGroupExpensesQuery(
  groupId: string,
  pinnedExpenseIds: string[],
) {
  const stableIds = Array.from(new Set(pinnedExpenseIds));
  stableIds.sort();

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

      const expenses: ExpenseItem[] = [];
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        if (result.value === null) continue;
        expenses.push(result.value);
      }

      return expenses;
    },
    staleTime: 30_000,
  });
}

export function useGroupReportsTotalsQuery(
  groupId: string,
  filter: {
    range: 'all' | 'custom';
    startDate?: string;
    endDate?: string;
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'group-reports-totals',
      groupId,
      filter.range,
      filter.startDate ?? null,
      filter.endDate ?? null,
    ],
    enabled,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const response = await groupReportsTotalsEndpoint({
        param: { id: groupId },
        query: {
          range: filter.range,
          ...(filter.startDate ? { startDate: filter.startDate } : {}),
          ...(filter.endDate ? { endDate: filter.endDate } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(m['system.loadTotalsFailed']());
      }

      return (await response.json()) as GroupReportsTotalsSuccess;
    },
  });
}

export function useGroupReportsBalancesQuery(
  groupId: string,
  filter: {
    range: 'all' | 'custom';
    startDate?: string;
    endDate?: string;
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'group-reports-balances',
      groupId,
      filter.range,
      filter.startDate ?? null,
      filter.endDate ?? null,
    ],
    enabled,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const response = await groupReportsBalancesEndpoint({
        param: { id: groupId },
        query: {
          range: filter.range,
          ...(filter.startDate ? { startDate: filter.startDate } : {}),
          ...(filter.endDate ? { endDate: filter.endDate } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(m['system.loadBalancesFailed']());
      }

      return (await response.json()) as GroupReportsBalancesSuccess;
    },
  });
}

export function useGroupReportsCategoryCountQuery(
  groupId: string,
  filter: {
    range: 'all' | 'custom';
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    uncategorized?: boolean;
    currency: string;
    participantIds?: string[];
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'group-reports-category-count',
      groupId,
      filter.range,
      filter.startDate ?? null,
      filter.endDate ?? null,
      filter.categoryId ?? null,
      filter.uncategorized ?? false,
      filter.currency,
      [...(filter.participantIds ?? [])].sort().join(','),
    ],
    enabled,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const response = await groupReportsCategoryCountEndpoint({
        param: { id: groupId },
        query: {
          range: filter.range,
          currency: filter.currency,
          ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
          ...(filter.uncategorized ? { uncategorized: 'true' } : {}),
          ...(filter.startDate ? { startDate: filter.startDate } : {}),
          ...(filter.endDate ? { endDate: filter.endDate } : {}),
          ...(filter.participantIds && filter.participantIds.length > 0
            ? { participantIds: filter.participantIds.join(',') }
            : {}),
        },
      });

      if (!response.ok) {
        throw new Error(m['system.loadExpenseTotalFailed']());
      }

      return (await response.json()) as GroupReportsCategoryCountSuccess;
    },
  });
}

export function useGroupReportsSharesQuery(
  groupId: string,
  filter: {
    range: 'all' | 'custom';
    startDate?: string;
    endDate?: string;
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'group-reports-shares',
      groupId,
      filter.range,
      filter.startDate ?? null,
      filter.endDate ?? null,
    ],
    enabled,
    placeholderData: (previous) => previous,
    queryFn: async () => {
      const response = await groupReportsSharesEndpoint({
        param: { id: groupId },
        query: {
          range: filter.range,
          ...(filter.startDate ? { startDate: filter.startDate } : {}),
          ...(filter.endDate ? { endDate: filter.endDate } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(m['system.loadSharesFailed']());
      }

      return (await response.json()) as GroupReportsSharesSuccess;
    },
  });
}
