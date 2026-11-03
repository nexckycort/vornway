import { ChevronRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { Ref } from 'react';
import { formatCurrency, formatLongDate } from '#/lib/i18n';
import { CategoryIcon } from '#/routes/_authed/groups/$id/-components/category-icon';
import { getExpenseEmoji } from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { getGroupDetailMessages } from '#/routes/_authed/groups/$id/-messages';
import type { ExpenseItem } from '#/routes/_authed/groups/$id/-types/group-detail.types';

type Messages = ReturnType<typeof getGroupDetailMessages>;

type CategoryExpenseHistoryProps = {
  t: Messages;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  expenseCount: number;
  filteredExpenses: ExpenseItem[];
  groupedExpenses: { label: string; items: ExpenseItem[] }[];
  categoryColor: string;
  loadMoreRef: Ref<HTMLDivElement>;
  onOpenExpense: (expenseId: string) => void;
};

export function CategoryExpenseHistory({
  t,
  isLoading: activeHistoryLoading,
  isFetchingNextPage: activeHistoryFetchingNextPage,
  expenseCount: historyExpenseCount,
  filteredExpenses,
  groupedExpenses,
  categoryColor: resolvedCategoryColor,
  loadMoreRef,
  onOpenExpense: handleOpenExpense,
}: CategoryExpenseHistoryProps) {
  return (
    <section className="rounded-[28px] border border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-[#132238]">
          {t.reports.categoryHistory}
        </h2>
        <p className="mt-1 text-xs text-[#64748b]">
          {t.reports.categoryExpensesCount(historyExpenseCount)}
        </p>
      </div>

      {activeHistoryLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] animate-pulse rounded-2xl bg-[#f1f5f9]"
            />
          ))}
        </div>
      ) : null}

      {!activeHistoryLoading && filteredExpenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#fafafa] px-5 py-12 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[#f3f4f6] text-xl">
            💸
          </div>
          <p className="text-sm font-medium text-[#132238]">
            {t.reports.categoryNoExpensesTitle}
          </p>
          <p className="mt-1 text-sm text-[#64748b]">
            {t.reports.categoryNoExpensesCopy}
          </p>
        </div>
      ) : null}

      {!activeHistoryLoading ? (
        <div className="space-y-5">
          {groupedExpenses.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-sm font-medium text-[#555555]">
                {group.label}
              </p>
              <div className="space-y-3">
                {group.items.map((expense) => (
                  <button
                    type="button"
                    key={expense.id}
                    onClick={() => handleOpenExpense(expense.id)}
                    className="native-tap flex w-full items-center gap-3 rounded-[24px] border border-[#e5e7eb] bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#fafafa]"
                  >
                    <div
                      className="flex size-12 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: `${resolvedCategoryColor}1f`,
                        color: resolvedCategoryColor,
                      }}
                    >
                      <CategoryIcon
                        icon={expense.category?.icon}
                        color={expense.category?.color ?? resolvedCategoryColor}
                        fallback={
                          <span className="text-xl">
                            {getExpenseEmoji(expense)}
                          </span>
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#132238]">
                            {expense.description}
                          </p>
                          <p className="mt-1 truncate text-xs text-[#64748b]">
                            {expense.paidBy.name}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-[#132238]">
                            {formatCurrency(expense.currency, expense.amount)}
                          </p>
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-[#94a3b8]">
                            <span>{formatLongDate(expense.date)}</span>
                            <HugeiconsIcon
                              icon={ChevronRightIcon}
                              className="size-3.5"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div ref={loadMoreRef} className="h-8" />

      {activeHistoryFetchingNextPage ? (
        <p className="mt-2 text-center text-sm text-[#64748b]">Cargando más…</p>
      ) : null}
    </section>
  );
}
