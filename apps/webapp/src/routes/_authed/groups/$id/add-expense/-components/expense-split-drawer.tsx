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
import { splitMethods } from '../-lib/expense-form.types';

type ExpenseSplitDrawerProps = { form: ExpenseForm };

export function ExpenseSplitDrawer({ form }: ExpenseSplitDrawerProps) {
  const {
    groupMessages,
    setMethod,
    setShowSplitDrawer,
    showSplitDrawer,
    splitMethod,
  } = form;

  return (
    <Drawer open={showSplitDrawer} onOpenChange={setShowSplitDrawer}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{groupMessages.expense.splitMethodTitle}</DrawerTitle>
          <DrawerDescription>
            {groupMessages.expense.splitMethodDescription}
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-2 px-5 pb-5">
          {splitMethods.map((method) => {
            const active = splitMethod === method.value;
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => setMethod(method.value)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                  active ? 'bg-rose-50' : 'bg-white'
                }`}
              >
                <div>
                  <p className="text-base font-semibold text-[#132238]">
                    {method.label}
                  </p>
                  <p className="text-sm text-[#64748b]">
                    {method.value === 'equal'
                      ? groupMessages.expense.splitEqualDescription
                      : method.value === 'percentage'
                        ? groupMessages.expense.splitPercentageDescription
                        : groupMessages.expense.splitExactDescription}
                  </p>
                </div>
                {active ? (
                  <HugeiconsIcon
                    icon={CheckIcon}
                    className="size-5 text-rose-500"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
