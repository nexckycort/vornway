import { CheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { cn } from '#/lib/utils';
import type { QuickSplitForm } from '../-hooks/use-quick-split-form';
import {
  currencyOptions,
  getSplitMethodDescription,
  getSplitMethodLabel,
  splitMethods,
} from './quick-split-model';

export function QuickSplitDrawers({ form }: { form: QuickSplitForm }) {
  const {
    t,
    showCurrencyDrawer,
    setShowCurrencyDrawer,
    showSplitDrawer,
    setShowSplitDrawer,
    splitMethod,
    setMethod,
    currency,
    setCurrency,
  } = form;

  return (
    <>
      <Drawer open={showCurrencyDrawer} onOpenChange={setShowCurrencyDrawer}>
        <DrawerContent className="mx-auto w-full max-w-[412px] rounded-t-[32px] px-4 pb-6">
          <DrawerHeader className="px-1 pt-2 text-left">
            <DrawerTitle>{t.currencyPickerTitle}</DrawerTitle>
            <DrawerDescription>{t.currencyPickerDescription}</DrawerDescription>
          </DrawerHeader>

          <div className="mt-4 flex flex-col gap-2">
            {currencyOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setCurrency(option.code);
                  setShowCurrencyDrawer(false);
                }}
                className={cn(
                  'flex items-center justify-between rounded-[24px] border px-4 py-4 text-left',
                  option.code === currency
                    ? 'border-primary bg-[#fff5f6]'
                    : 'border-[#e5e7eb] bg-white',
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-[#111827]">
                    {option.flag} {option.code}
                  </p>
                  <p className="mt-1 text-xs text-[#64748b]">{option.name}</p>
                </div>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={showSplitDrawer} onOpenChange={setShowSplitDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t.splitMethodTitle}</DrawerTitle>
            <DrawerDescription>{t.splitMethodCopy}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 px-5 pb-5">
            {splitMethods.map((method) => {
              const active = splitMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setMethod(method)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition ${
                    active ? 'bg-rose-50' : 'bg-white'
                  }`}
                >
                  <div>
                    <p className="text-base font-semibold text-[#132238]">
                      {getSplitMethodLabel(method, t)}
                    </p>
                    <p className="text-sm text-[#64748b]">
                      {getSplitMethodDescription(method, t)}
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
    </>
  );
}
