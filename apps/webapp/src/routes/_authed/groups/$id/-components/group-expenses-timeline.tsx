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
            <p className="mb-3 text-sm font-medium text-[#64748b]">
              {dayGroup.label}
            </p>
            <div className="flex flex-col">
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
