import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { ApiSuccess, Cursor } from '@vornway/api-client';
import { useEffect } from 'react';
import { api, failWithMessage, withErrorMessage } from '#/api/client';
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

function mapExpenseDetailToExpenseItem(
  expense: ApiSuccess<'groups', 'getExpense'>,
): ExpenseItem {
  const paidByMembers =
    (
      expense as typeof expense & {
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
    isPersonal: expense.participants?.length === 0,
    expenseType: 'standard',
    subExpenseCount: 0,
    settlementToName: null,
    paidBy: expense.paidBy,
    paidByMembers,
    category: expense.category ?? null,
    participantCount: expense.participants?.length ?? 0,
    currentUserBalance: null,
    attachmentUrl: expense.attachmentUrl ?? null,
    tags: expense.tags ?? [],
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

      const group = await api.groups.get
        .request({ params: { id: groupId } })
        .catch(() => undefined);

      if (!group) {
        if (localGroup) {
          return buildPendingGroupSummary(localGroup);
        }

        if (cachedGroup) {
          return cachedGroup;
        }

        throw new Error(m['system.loadGroupFailed']());
      }

      removeLocalGroupFallback(groupId);
      upsertCachedGroupSummary(group);
      return group;
    },
  });
}

export function useGroupExpensesInfiniteQuery(groupId: string) {
  return useInfiniteQuery({
    queryKey: ['group-expenses', groupId],
    initialPageParam: null as Cursor | null,
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

      const page = await api.groups.listExpenses
        .request({
          params: { id: groupId },
          query: {
            limit: PAGE_LIMIT,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        })
        .catch(() => undefined);

      if (!page) {
        return (
          cachedPage ??
          ({
            data: [],
            pagination: { limit: PAGE_LIMIT, total: 0, nextCursor: null },
          } as GroupExpensesPageSuccess)
        );
      }

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

      return withErrorMessage(
        api.groups.getExpense.request({ params: { id: groupId, expenseId } }),
        m['system.loadExpenseFailed'](),
      );
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
          const expense = await api.groups.getExpense
            .request({ params: { id: groupId, expenseId } })
            .catch(() => null);

          return expense && mapExpenseDetailToExpenseItem(expense);
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
    queryFn: () =>
      failWithMessage(
        api.groups.reportTotals.request({
          params: { id: groupId },
          query: {
            range: filter.range,
            ...(filter.startDate ? { startDate: filter.startDate } : {}),
            ...(filter.endDate ? { endDate: filter.endDate } : {}),
          },
        }),
        m['system.loadTotalsFailed'](),
      ),
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
    queryFn: () =>
      failWithMessage(
        api.groups.reportBalances.request({
          params: { id: groupId },
          query: {
            range: filter.range,
            ...(filter.startDate ? { startDate: filter.startDate } : {}),
            ...(filter.endDate ? { endDate: filter.endDate } : {}),
          },
        }),
        m['system.loadBalancesFailed'](),
      ),
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
    queryFn: () =>
      failWithMessage(
        api.groups.reportCategoryCount.request({
          params: { id: groupId },
          query: {
            range: filter.range,
            currency: filter.currency,
            ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
            ...(filter.uncategorized ? { uncategorized: true } : {}),
            ...(filter.startDate ? { startDate: filter.startDate } : {}),
            ...(filter.endDate ? { endDate: filter.endDate } : {}),
            ...(filter.participantIds && filter.participantIds.length > 0
              ? { participantIds: filter.participantIds.join(',') }
              : {}),
          },
        }),
        m['system.loadExpenseTotalFailed'](),
      ),
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
    queryFn: () =>
      failWithMessage(
        api.groups.reportShares.request({
          params: { id: groupId },
          query: {
            range: filter.range,
            ...(filter.startDate ? { startDate: filter.startDate } : {}),
            ...(filter.endDate ? { endDate: filter.endDate } : {}),
          },
        }),
        m['system.loadSharesFailed'](),
      ),
  });
}
