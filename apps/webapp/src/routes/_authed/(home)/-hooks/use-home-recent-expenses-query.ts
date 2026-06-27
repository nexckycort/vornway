import { useQuery } from '@tanstack/react-query';
import { getCachedGroupExpensesPage } from '#/lib/group-expenses-query-collection';
import { client } from '#/lib/hc';
import type { ExpenseItem } from '#/routes/_authed/groups/$id/-types/group-detail.types';

const groupExpensesEndpoint = client.api.groups[':id'].expenses.$get;
const RECENT_EXPENSE_LIMIT = 3;

export type HomeRecentExpense = {
  id: string;
  groupId: string;
  groupName: string;
  expense: ExpenseItem;
  syncStatus?: 'pending';
};

type HomeRecentGroup = {
  id: string;
  name: string;
};

function compareExpenseDate(
  left: HomeRecentExpense,
  right: HomeRecentExpense,
): number {
  return (
    new Date(right.expense.date).getTime() -
    new Date(left.expense.date).getTime()
  );
}

export function useHomeRecentExpensesQuery(groups: HomeRecentGroup[]) {
  return useQuery<HomeRecentExpense[]>({
    queryKey: ['home-recent-expenses', groups.map((group) => group.id)],
    enabled: groups.length > 0,
    queryFn: async () => {
      const pages = await Promise.all(
        groups.map(async (group) => {
          const cachedPage = await getCachedGroupExpensesPage(group.id, null);

          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return {
              group,
              expenses: (cachedPage?.data ?? []) as ExpenseItem[],
            };
          }

          try {
            const response = await groupExpensesEndpoint({
              param: { id: group.id },
              query: {
                limit: String(RECENT_EXPENSE_LIMIT),
              },
            });

            if (!response.ok) {
              return {
                group,
                expenses: (cachedPage?.data ?? []) as ExpenseItem[],
              };
            }

            const payload = (await response.json()) as {
              data: ExpenseItem[];
            };

            return {
              group,
              expenses: payload.data,
            };
          } catch {
            return {
              group,
              expenses: (cachedPage?.data ?? []) as ExpenseItem[],
            };
          }
        }),
      );

      return pages
        .flatMap(({ group, expenses }) =>
          expenses.map((expense) => ({
            id: expense.id,
            groupId: group.id,
            groupName: group.name,
            expense,
          })),
        )
        .sort(compareExpenseDate)
        .slice(0, RECENT_EXPENSE_LIMIT);
    },
    initialData: [],
  });
}
