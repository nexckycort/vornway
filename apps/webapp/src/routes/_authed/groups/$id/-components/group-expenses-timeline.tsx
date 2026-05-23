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
      {isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error
            ? error.message
            : 'No se pudieron cargar los gastos'}
        </div>
      ) : null}

      {!isLoading && groupedExpenses.length === 0 ? (
        <div className="rounded-[32px] border border-white bg-gradient-to-b from-white to-[#f8fafc] px-6 py-14 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-[26px] bg-[#0f172a] text-2xl shadow-[0_14px_32px_rgba(15,23,42,0.18)]">
            💸
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[#132238]">
            No tienes gastos aún
          </h3>
          <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-[#64748b]">
            Crea tu primer gasto y empieza a organizar este grupo.
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
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
