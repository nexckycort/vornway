import type { NavigateOptions } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import type { RefObject } from 'react';
import { getGroupFlowEntryState } from '#/lib/group-flow-navigation';
import {
  FigmaCategoriesSlide,
  FigmaHistory,
  FigmaSummaryCard,
} from './finance-dashboard-components';
import type {
  FinanceCategory,
  FinanceDebtPaymentMovement,
  FinanceGroupExpenseMovement,
  FinanceMovement,
  FinanceMovementTransaction,
  FinanceView,
} from './finance-model';

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
  onGoTo: (view: FinanceView, transactionId?: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#efefef] px-0 text-[#1e1e1e] md:px-4 md:py-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col overflow-x-hidden bg-[#fafafa] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(var(--safe-top))] md:min-h-[calc(100dvh-2rem)] md:rounded-[28px] md:px-5 md:pt-4">
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
