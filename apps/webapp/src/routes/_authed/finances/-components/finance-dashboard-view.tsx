import type { NavigateOptions } from '@tanstack/react-router';
import { useNavigate } from '@tanstack/react-router';
import type { RefObject } from 'react';
import { getGroupFlowEntryState } from '#/lib/group-flow-navigation';
import { m } from '#/paraglide/messages.js';
import {
  FigmaHistory,
  FigmaSummaryCard,
  FigmaSummaryTile,
} from './finance-dashboard-components';
import { FinanceTab } from './finance-layout';
import {
  type FinanceDebtPaymentMovement,
  type FinanceGroupExpenseMovement,
  type FinanceMovement,
  type FinanceMovementTransaction,
  type FinanceView,
  formatMonthLabel,
  moneyLabel,
} from './finance-model';

export function FinanceDashboardView({
  month,
  income,
  totalExpense,
  balance,
  groupExpense,
  personalExpense,
  owedToYou,
  owedByYou,
  accountTotal,
  accountAvailable,
  accountLocked,
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
  groupExpense: number;
  personalExpense: number;
  owedToYou: number;
  owedByYou: number;
  accountTotal: number;
  accountAvailable: number;
  accountLocked: number;
  movements: FinanceMovement[];
  loadMoreRef: RefObject<HTMLDivElement | null>;
  isMovementsLoading: boolean;
  isFetchingNextMovementsPage: boolean;
  onSetMonth: (month: string) => void;
  onGoTo: (view: FinanceView, transactionId?: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#f3f3f3] text-[#1e1e1e]">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col overflow-x-hidden px-4 pb-28 pt-6">
        <header className="flex items-center justify-between gap-3">
          <h1 className="truncate text-2xl font-semibold leading-8">
            {m['finances.title']()}
          </h1>
          <label className="relative h-8 shrink-0 overflow-hidden rounded-full border border-[#e9e9e9] bg-white px-3 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
            <span className="flex h-full items-center text-sm font-medium text-[#1e1e1e]">
              {formatMonthLabel(month)}
            </span>
            <input
              type="month"
              value={month}
              onChange={(event) => onSetMonth(event.target.value)}
              className="absolute inset-0 opacity-0"
              aria-label={m['finances.month']()}
            />
          </label>
        </header>

        <nav
          className="-mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-1"
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
          <FinanceTab onClick={() => onGoTo('reports')}>
            {m['finances.reports']()}
          </FinanceTab>
        </nav>

        <div className="mt-7">
          <FigmaSummaryCard
            income={income}
            totalExpense={totalExpense}
            balance={balance}
            onAdd={() => onGoTo('new')}
          />
        </div>

        <section className="mt-4">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">
            {m['finances.financialSummary']()}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-4 rounded-[24px] border border-[#e9e9e9] bg-[#e9e9e9] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <FigmaSummaryTile
              label={m['finances.groupExpenses']()}
              value={moneyLabel(groupExpense)}
              tone="blue"
            />
            <FigmaSummaryTile
              label={m['finances.personalSpace']()}
              value={moneyLabel(personalExpense)}
            />
            <FigmaSummaryTile
              label={m['finances.pendingToReceive']()}
              value={moneyLabel(owedToYou)}
            />
            <FigmaSummaryTile
              label={m['finances.pendingToPay']()}
              value={moneyLabel(owedByYou)}
            />
          </div>
        </section>

        <section className="mt-4">
          <h2 className="text-sm font-semibold text-[#1e1e1e]">
            {m['finances.accounts']()}
          </h2>
          <button
            type="button"
            onClick={() =>
              void navigate({ to: '/finances/accounts', search: { month } })
            }
            className="mt-2 grid w-full min-w-0 gap-2 rounded-[24px] border border-[#e9e9e9] bg-white p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05)] sm:grid-cols-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs text-black/45">
                {m['finances.accountTotal']()}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {moneyLabel(accountTotal)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-black/45">
                {m['finances.accountAvailable']()}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {moneyLabel(accountAvailable)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-black/45">
                {m['finances.accountLocked']()}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {moneyLabel(accountLocked)}
              </p>
            </div>
          </button>
        </section>

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
