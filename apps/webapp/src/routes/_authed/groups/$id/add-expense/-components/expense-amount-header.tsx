import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExpenseForm } from '../-hooks/use-expense-form';
import { getCurrencySymbol } from '../-lib/expense-form.utils';

type ExpenseAmountHeaderProps = { form: ExpenseForm };

export function ExpenseAmountHeader({ form }: ExpenseAmountHeaderProps) {
  const {
    amount,
    amountInputRef,
    currency,
    currentCurrency,
    groupMessages,
    isAmountAnimating,
    setAmount,
    setShowCurrencyDrawer,
  } = form;

  return (
    <div className="px-2 pb-6">
      <div className="flex items-baseline justify-between gap-4">
        <button
          type="button"
          onClick={() => setShowCurrencyDrawer(true)}
          className="flex items-center gap-1 text-left"
        >
          <span className="text-4xl font-light text-gray-900">
            {currentCurrency.label}
          </span>
          <HugeiconsIcon
            icon={ChevronDownIcon}
            className="size-5 text-gray-600"
          />
        </button>

        <label className="min-w-0 flex-1 text-right">
          <span className="sr-only">{groupMessages.expense.amount}</span>
          <div className="relative flex min-h-14 w-full items-end justify-end">
            <div
              aria-hidden="true"
              className={`pointer-events-none inline-flex origin-right items-baseline justify-end gap-1 text-4xl font-light leading-none text-gray-900 transition-transform duration-150 ease-out ${
                isAmountAnimating ? 'scale-[1.02]' : 'scale-100'
              }`}
            >
              <span className="shrink-0">{getCurrencySymbol(currency)}</span>
              <span className="tabular-nums">
                {amount.length > 0 ? amount : '0'}
              </span>
            </div>

            <input
              ref={amountInputRef}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              aria-label={groupMessages.expense.amount}
              className="absolute inset-0 h-full w-full bg-transparent text-right text-[16px] leading-none tabular-nums text-transparent outline-none caret-gray-900 [font-size:16px]"
            />
          </div>
        </label>
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-base">{currentCurrency.flag}</span>
        <span className="text-sm text-gray-500">{currentCurrency.name}</span>
      </div>
    </div>
  );
}
