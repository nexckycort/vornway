import { type RefObject, useMemo } from 'react';

import { Skeleton } from '#/components/ui/skeleton';
import { getGroupDetailMessages } from '../-messages';
import type { ExpenseItem } from '../-types/group-detail.types';
import { groupExpensesByDate } from './group-detail.utils';
import { GroupExpenseRow } from './group-expense-row';

type GroupExpensesTimelineProps = {
  expenses: ExpenseItem[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetchingNextPage: boolean;
  pinnedExpenseIds: string[];
  loadMoreRef: RefObject<HTMLDivElement | null>;
  onOpenExpense: (expenseId: string) => void;
  onOpenOptions: (expense: ExpenseItem) => void;
  onDeleteExpense: (expense: ExpenseItem) => void;
  onEditExpense: (expense: ExpenseItem) => void;
};

export function GroupExpensesTimeline({
  expenses,
  isLoading,
  isError,
  error,
  isFetchingNextPage,
  pinnedExpenseIds,
  loadMoreRef,
  onOpenExpense,
  onOpenOptions,
  onDeleteExpense,
  onEditExpense,
}: GroupExpensesTimelineProps) {
  const t = getGroupDetailMessages();
  const sortedExpenses = useMemo(() => {
    const pinnedSet = new Set(pinnedExpenseIds);

    return expenses.slice().sort((left, right) => {
      const leftPinned = pinnedSet.has(left.id);
      const rightPinned = pinnedSet.has(right.id);

      if (leftPinned !== rightPinned) {
        return leftPinned ? -1 : 1;
      }

      const leftDate = new Date(left.date).getTime();
      const rightDate = new Date(right.date).getTime();

      return rightDate - leftDate;
    });
  }, [expenses, pinnedExpenseIds]);

  const groupedExpenses = groupExpensesByDate(sortedExpenses);

  return (
    <section className="mb-7">
      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, dayIndex) => (
            <div key={`skeleton-day-${dayIndex}`}>
              <div className="mb-3 flex items-center gap-3">
                <Skeleton className="h-8 w-36 rounded-full bg-[#e5e7eb]" />
                <Skeleton className="h-px flex-1 rounded-full bg-[#e5e7eb]" />
              </div>

              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, rowIndex) => (
                  <article
                    key={`skeleton-row-${dayIndex}-${rowIndex}`}
                    className="rounded-[22px] border border-[#e5e7eb] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-center gap-3.5 px-4 py-2">
                      <Skeleton className="size-12 shrink-0 rounded-full bg-[#f3f4f6]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <Skeleton className="h-4 w-28 rounded-full bg-[#e5e7eb]" />
                            <Skeleton className="mt-2 h-3 w-40 rounded-full bg-[#e5e7eb]" />
                          </div>
                          <div className="shrink-0 text-right">
                            <Skeleton className="ml-auto h-4 w-20 rounded-full bg-[#e5e7eb]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : t.detail.expensesLoadFailed}
        </div>
      ) : null}

      {!isLoading && groupedExpenses.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#f3f4f6] text-2xl">
            💸
          </div>
          <h3 className="text-base font-semibold text-[#132238]">
            {t.detail.emptyExpensesTitle}
          </h3>
          <p className="mt-2 text-sm text-[#64748b]">
            {t.detail.emptyExpensesCopy}
          </p>
        </div>
      ) : null}

      <div className="space-y-5">
        {groupedExpenses.map((dayGroup) => (
          <div key={dayGroup.label}>
            <p className="mb-2 text-sm font-medium text-[#555555]">
              {dayGroup.label}
            </p>
            <div className="flex flex-col gap-3">
              {dayGroup.items.map((expense) => (
                <GroupExpenseRow
                  key={expense.id}
                  expense={expense}
                  isPinned={pinnedExpenseIds.includes(expense.id)}
                  onOpenExpense={onOpenExpense}
                  onOpenOptions={onOpenOptions}
                  onDeleteExpense={onDeleteExpense}
                  onEditExpense={onEditExpense}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div ref={loadMoreRef} className="h-8" />

      {isFetchingNextPage ? (
        <p className="text-center text-sm text-[#64748b]">
          {t.detail.loadingMore}
        </p>
      ) : null}
    </section>
  );
}
