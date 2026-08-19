import { ChevronLeftIcon, ChevronRightIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { NavigateOptions } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import type { RefObject } from 'react';
import { getGroupFlowEntryState } from '#/lib/group-flow-navigation';
import { m } from '#/paraglide/messages.js';
import {
  FigmaCategoriesSlide,
  FigmaHistory,
  FigmaSummaryCard,
} from './finance-dashboard-components';
import { FinanceTab } from './finance-layout';
import {
  type FinanceCategory,
  type FinanceDebtPaymentMovement,
  type FinanceGroupExpenseMovement,
  type FinanceMovement,
  type FinanceMovementTransaction,
  type FinanceView,
  formatMonthLabel,
} from './finance-model';

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(
    year || new Date().getFullYear(),
    (monthNumber || 1) - 1 + offset,
    1,
  );
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function FinanceDashboardView({
  month,
  income,
  totalExpense,
  balance,
  categories,
  categoryTotals,
  movements,
  loadMoreRef,
  isMovementsLoading,
  isFetchingNextMovementsPage,
  onSetMonth,
  onGoTo,
}: {
  month: string;
  income: number;
  totalExpense: number;
  balance: number;
  categories: FinanceCategory[];
  categoryTotals: Record<string, number>;
  movements: FinanceMovement[];
  loadMoreRef: RefObject<HTMLDivElement | null>;
  isMovementsLoading: boolean;
  isFetchingNextMovementsPage: boolean;
  onSetMonth: (month: string) => void;
  onGoTo: (view: FinanceView, transactionId?: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#efefef] px-0 text-[#1e1e1e] md:px-4 md:py-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col overflow-x-hidden bg-[#fafafa] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(var(--safe-top)+1rem)] md:min-h-[calc(100dvh-2rem)] md:rounded-[28px] md:px-5 md:pt-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="truncate text-2xl font-semibold leading-8">
            {m['finances.title']()}
          </h1>
          <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-[#e2e8f0] bg-white px-2 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              aria-label={m['finances.previousMonth']()}
              onClick={() => onSetMonth(shiftMonth(month, -1))}
              className="flex size-6 items-center justify-center rounded-full text-[#1e1e1e] hover:bg-[#f1f5f9]"
            >
              <HugeiconsIcon icon={ChevronLeftIcon} className="size-4" />
            </button>
            <label className="relative flex h-full min-w-20 items-center justify-center px-1">
              <span className="text-xs font-semibold capitalize text-[#334155]">
                {formatMonthLabel(month)}
              </span>
              <input
                type="month"
                value={month}
                onChange={(event) => onSetMonth(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label={m['finances.month']()}
              />
            </label>
            <button
              type="button"
              aria-label={m['finances.nextMonth']()}
              onClick={() => onSetMonth(shiftMonth(month, 1))}
              className="flex size-6 items-center justify-center rounded-full text-[#1e1e1e] hover:bg-[#f1f5f9]"
            >
              <HugeiconsIcon icon={ChevronRightIcon} className="size-4" />
            </button>
          </div>
        </header>

        <nav
          className="-mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={m['finances.title']()}
        >
          <FinanceTab active onClick={() => onGoTo('dashboard')}>
            {m['finances.movements']()}
          </FinanceTab>
          <FinanceTab onClick={() => void navigate({ to: '/goals' })}>
            {m['finances.goals']()}
          </FinanceTab>
          <FinanceTab
            onClick={() =>
              void navigate({
                to: '/debts',
                search: { from: 'finances' },
              } as NavigateOptions)
            }
          >
            {m['finances.debts']()}
          </FinanceTab>
          <FinanceTab
            onClick={() =>
              void navigate({ to: '/finances/accounts', search: { month } })
            }
          >
            {m['finances.accounts']()}
          </FinanceTab>
          <FinanceTab
            onClick={() =>
              void navigate({ to: '/finances/categories', search: { month } })
            }
          >
            {m['finances.categories']()}
          </FinanceTab>
          <FinanceTab
            onClick={() =>
              void navigate({ to: '/finances/budgets', search: { month } })
            }
          >
            {m['finances.budgets']()}
          </FinanceTab>
          <FinanceTab
            onClick={() =>
              void navigate({
                to: '/finances/reports',
                search: { month },
              })
            }
          >
            {m['finances.reports']()}
          </FinanceTab>
        </nav>

        <div className="mt-6">
          <FigmaSummaryCard
            income={income}
            totalExpense={totalExpense}
            balance={balance}
            onAdd={() => onGoTo('new')}
          />
        </div>

        <FigmaCategoriesSlide
          categories={categories}
          totals={categoryTotals}
          onOpen={() =>
            void navigate({ to: '/finances/categories', search: { month } })
          }
        />

        <FigmaHistory
          movements={movements}
          loadMoreRef={loadMoreRef}
          isLoading={isMovementsLoading}
          isFetchingNextPage={isFetchingNextMovementsPage}
          onOpenTransaction={(nextTransaction: FinanceMovementTransaction) =>
            void navigate({
              to: '/finances/movements/$id',
              params: { id: nextTransaction.id },
              search: { month, accountId: undefined },
            })
          }
          onOpenGroupExpense={(movement: FinanceGroupExpenseMovement) =>
            void navigate({
              to: '/groups/$id/expense/$expenseId',
              params: { id: movement.groupId, expenseId: movement.id },
              state: getGroupFlowEntryState(
                `/finances?view=dashboard&month=${month}`,
              ),
            })
          }
          onOpenDebtPayment={(movement: FinanceDebtPaymentMovement) =>
            void navigate({
              to: '/debts/$id',
              params: { id: movement.debtId },
              search: { from: 'finances' },
            } as NavigateOptions)
          }
        />
      </div>
    </main>
  );
}
