import { CalendarDays } from 'lucide-react';
import type { RefObject } from 'react';

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
}: GroupExpensesTimelineProps) {
  const groupedExpenses = groupExpensesByDate(expenses);

  return (
    <section className="mb-7">
      {isLoading ? (
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, dayIndex) => (
            <div key={`skeleton-day-${dayIndex}`}>
              <div className="mb-3 flex items-center gap-3">
                <span className="h-8 w-36 rounded-full border border-[#e2e8f0] bg-white" />
                <span className="h-px flex-1 bg-gradient-to-r from-[#e2e8f0] to-transparent" />
              </div>

              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((__, rowIndex) => (
                  <article
                    key={`skeleton-row-${dayIndex}-${rowIndex}`}
                    className="rounded-[24px] border border-[#e2e8f0] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-11 rounded-full bg-[#f1f5f9]" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-40 rounded-full bg-[#e2e8f0]" />
                        <div className="h-3 w-28 rounded-full bg-[#e2e8f0]" />
                        <div className="h-3 w-24 rounded-full bg-[#e2e8f0]" />
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="ml-auto h-4 w-20 rounded-full bg-[#e2e8f0]" />
                        <div className="ml-auto h-3 w-12 rounded-full bg-[#e2e8f0]" />
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
          {error instanceof Error
            ? error.message
            : 'No se pudieron cargar los gastos'}
        </div>
      ) : null}

      {!isLoading && groupedExpenses.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] px-6 py-14 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#f3f4f6] text-2xl">
            💸
          </div>
          <h3 className="text-base font-semibold text-[#132238]">
            No tienes gastos aún
          </h3>
          <p className="mt-2 text-sm text-[#64748b]">
            Crea tu primer gasto y empieza a organizar este grupo.
          </p>
        </div>
      ) : null}

      <div className="space-y-5">
        {groupedExpenses.map((dayGroup) => (
          <div key={dayGroup.label}>
            <div className="mb-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
                <CalendarDays className="size-3.5 text-primary" />
                {dayGroup.label}
              </span>
              <span className="h-px flex-1 bg-gradient-to-r from-[#e2e8f0] to-transparent" />
            </div>
            <div className="flex flex-col gap-3">
              {dayGroup.items.map((expense) => (
                <GroupExpenseRow
                  key={expense.id}
                  expense={expense}
                  isPinned={pinnedExpenseIds.includes(expense.id)}
                  onOpenExpense={onOpenExpense}
                  onOpenOptions={onOpenOptions}
                  onDeleteExpense={onDeleteExpense}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div ref={loadMoreRef} className="h-8" />

      {isFetchingNextPage ? (
        <p className="text-center text-sm text-[#64748b]">Cargando más...</p>
      ) : null}
    </section>
  );
}
