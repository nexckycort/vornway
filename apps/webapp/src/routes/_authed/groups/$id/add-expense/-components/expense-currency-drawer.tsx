import { CheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import type { ExpenseForm } from '../-hooks/use-expense-form';
import { currencyMeta, currencyOptions } from '../-lib/expense-form.types';

type ExpenseCurrencyDrawerProps = { form: ExpenseForm };

export function ExpenseCurrencyDrawer({ form }: ExpenseCurrencyDrawerProps) {
  const {
    currency,
    groupMessages,
    setCurrencyAndClose,
    setShowCurrencyDrawer,
    showCurrencyDrawer,
  } = form;

  return (
    <Drawer open={showCurrencyDrawer} onOpenChange={setShowCurrencyDrawer}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{groupMessages.expense.currencyTitle}</DrawerTitle>
          <DrawerDescription>
            {groupMessages.expense.currencyDescription}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-1 px-5 pb-5">
          {currencyOptions.map((option) => {
            const meta = currencyMeta[option];
            const active = currency === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => setCurrencyAndClose(option)}
                className="flex w-full items-center justify-between rounded-2xl px-1 py-3 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl">{meta.flag}</span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-gray-900">
                      {meta.label} - {meta.name}
                    </p>
                  </div>
                </div>
                <span
                  className={`flex size-6 items-center justify-center rounded-full border ${
                    active
                      ? 'border-rose-500 bg-rose-500'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {active ? (
                    <HugeiconsIcon
                      icon={CheckIcon}
                      className="size-4 text-white"
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
