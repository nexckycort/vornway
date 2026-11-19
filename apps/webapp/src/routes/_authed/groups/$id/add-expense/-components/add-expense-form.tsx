import { MobilePageLayout } from '#/components/mobile-page-layout';
import { Button } from '#/components/ui/button';
import { m } from '#/paraglide/messages.js';
import { formatMoney } from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import { useExpenseForm } from '../-hooks/use-expense-form';
import type { ExpenseGroup, ExpenseRecord } from '../-lib/initial-values';
import { ExpenseAdvancedDetailsDrawer } from './expense-advanced-details-drawer';
import { ExpenseAmountHeader } from './expense-amount-header';
import { ExpenseCategoryDrawer } from './expense-category-drawer';
import { ExpenseCreateCategoryDialog } from './expense-create-category-dialog';
import { ExpenseCurrencyDrawer } from './expense-currency-drawer';
import { ExpenseDetailsFields } from './expense-details-fields';
import { ExpenseLineItemsDrawer } from './expense-line-items-drawer';
import { ExpensePayersSection } from './expense-payers-section';
import { ExpenseSplitDrawer } from './expense-split-drawer';
import { ExpenseSplitSection } from './expense-split-section';

type AddExpenseFormProps = {
  id: string;
  group: ExpenseGroup;
  expense: ExpenseRecord | undefined;
  expenseId: string | undefined;
};

export function AddExpenseForm({
  id,
  group,
  expense,
  expenseId,
}: AddExpenseFormProps) {
  const form = useExpenseForm({ id, group, expense, expenseId });
  const {
    baseAmount,
    currency,
    error,
    groupMessages,
    handleSubmit,
    isEditMode,
    isPersonalSpace,
    isSubmitLocked,
    navigateToGroupRoot,
    normalizedAmount,
    normalizedSharedAmount,
    selectedCount,
    sharedAmountExceedsTotal,
    splitIsValid,
    splitMethod,
    splitSum,
  } = form;

  return (
    <MobilePageLayout
      title={
        isEditMode
          ? groupMessages.expense.editExpenseTitle
          : groupMessages.expense.newExpenseTitle
      }
      onBack={() => navigateToGroupRoot(true)}
    >
      <ExpenseAmountHeader form={form} />

      <div className="space-y-5 px-2 pb-22">
        <ExpenseDetailsFields form={form} />

        {isPersonalSpace ? null : (
          <>
            <ExpensePayersSection form={form} />
            <ExpenseSplitSection form={form} />

            {!splitIsValid && selectedCount > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {sharedAmountExceedsTotal
                  ? groupMessages.expense.sharedAmountExceedsTotal
                  : splitMethod === 'percentage'
                    ? m['quickSplit.invalidPercentage']()
                    : groupMessages.expense.sharedSplitInvalid}
              </div>
            ) : null}
          </>
        )}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isPersonalSpace ? null : (
          <p className="text-xs text-gray-500">
            {selectedCount === 0
              ? groupMessages.expense.selectParticipantToSplit
              : splitMethod === 'percentage'
                ? groupMessages.expense.splitSummaryPercentage(
                    selectedCount,
                    splitSum.toFixed(2),
                    formatMoney(currency, baseAmount),
                    formatMoney(currency, normalizedAmount),
                  )
                : groupMessages.expense.splitSummaryAmount(
                    selectedCount,
                    formatMoney(
                      currency,
                      splitMethod === 'equal'
                        ? normalizedAmount
                        : splitSum + normalizedSharedAmount,
                    ),
                    formatMoney(currency, normalizedAmount),
                  )}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-200 bg-white px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitLocked}
          className="h-14 w-full rounded-full bg-rose-500 text-base font-medium text-white hover:bg-rose-500/90"
        >
          {isSubmitLocked
            ? isEditMode
              ? groupMessages.expense.savingExpense
              : groupMessages.expense.addingExpense
            : isEditMode
              ? groupMessages.common.saveChanges
              : groupMessages.expense.addExpense}
        </Button>
      </div>

      <ExpenseSplitDrawer form={form} />
      <ExpenseLineItemsDrawer form={form} />
      <ExpenseAdvancedDetailsDrawer form={form} />
      <ExpenseCategoryDrawer form={form} />
      <ExpenseCreateCategoryDialog form={form} />
      <ExpenseCurrencyDrawer form={form} />
    </MobilePageLayout>
  );
}
