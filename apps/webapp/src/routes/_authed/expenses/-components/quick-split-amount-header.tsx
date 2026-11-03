import { ChevronDownIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { QuickSplitForm } from '../-hooks/use-quick-split-form';
import { formatAmountInput } from './quick-split-model';

export function QuickSplitAmountHeader({ form }: { form: QuickSplitForm }) {
  const {
    t,
    isEditMode,
    setShowCurrencyDrawer,
    selectedCurrency,
    amountInput,
    setAmountInput,
  } = form;

  return (
    <div className="px-2 pb-6">
      {!isEditMode ? (
        <p className="mb-3 text-center text-xs font-normal leading-4 text-[#4c4c4c]">
          {t.step}
        </p>
      ) : null}

      <div className="flex items-baseline justify-between gap-4">
        <button
          type="button"
          onClick={() => setShowCurrencyDrawer(true)}
          className="flex items-center gap-1 text-left"
        >
          <span className="text-4xl font-light text-gray-900">
            {selectedCurrency.code}
          </span>
          <HugeiconsIcon
            icon={ChevronDownIcon}
            className="size-5 text-gray-600"
          />
        </button>

        <label className="min-w-0 flex-1 text-right">
          <span className="sr-only">{t.amountLabel}</span>
          <input
            inputMode="numeric"
            value={amountInput}
            onChange={(event) =>
              setAmountInput(formatAmountInput(event.target.value))
            }
            placeholder="0"
            className="w-full bg-transparent text-right text-[36px] font-light leading-10 tracking-[-0.03em] text-[#1e1e1e] outline-none placeholder:text-[#cbd5e1]"
          />
        </label>
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-base">{selectedCurrency.flag}</span>
        <span className="text-sm text-gray-500">{selectedCurrency.name}</span>
      </div>
    </div>
  );
}
