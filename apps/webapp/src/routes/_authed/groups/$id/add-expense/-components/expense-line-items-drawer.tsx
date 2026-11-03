import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { formatMoney } from '#/routes/_authed/groups/$id/-components/group-detail.utils';
import type { ExpenseForm } from '../-hooks/use-expense-form';

type ExpenseLineItemsDrawerProps = { form: ExpenseForm };

export function ExpenseLineItemsDrawer({ form }: ExpenseLineItemsDrawerProps) {
  const {
    addLineItem,
    currency,
    drawerLineItems,
    lineItemTotalsByMember,
    lineItemsDrawerMember,
    lineItemsMessages,
    removeLineItem,
    setLineItemsDrawerMemberId,
    showLineItemsError,
    updateLineItem,
  } = form;

  return (
    <Drawer
      open={Boolean(lineItemsDrawerMember)}
      onOpenChange={(open) => {
        if (!open) setLineItemsDrawerMemberId(null);
      }}
    >
      <DrawerContent className="flex max-h-[85dvh] flex-col overflow-hidden">
        <DrawerHeader>
          <DrawerTitle>
            {lineItemsDrawerMember
              ? lineItemsMessages.drawerTitle(lineItemsDrawerMember.name)
              : lineItemsMessages.title}
          </DrawerTitle>
          <DrawerDescription>
            {lineItemsMessages.drawerDescription}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
          {drawerLineItems.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.5rem] items-center gap-2"
            >
              <input
                value={item.description}
                onChange={(event) =>
                  updateLineItem(item.id, {
                    description: event.target.value,
                  })
                }
                placeholder={lineItemsMessages.itemPlaceholder}
                className="h-11 min-w-0 rounded-full border border-gray-200 bg-white px-4 text-sm outline-none placeholder:text-gray-400 focus:border-rose-500"
              />
              <input
                value={item.amount}
                onChange={(event) =>
                  updateLineItem(item.id, { amount: event.target.value })
                }
                inputMode="decimal"
                placeholder={lineItemsMessages.amountPlaceholder}
                aria-label={lineItemsMessages.amountPlaceholder}
                className="h-11 min-w-0 rounded-full border border-gray-200 bg-white px-3 text-right text-sm tabular-nums outline-none placeholder:text-gray-400 focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => removeLineItem(item.id)}
                aria-label={lineItemsMessages.removeItem}
                className="flex size-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              </button>
            </div>
          ))}

          {lineItemsDrawerMember ? (
            <button
              type="button"
              onClick={() => addLineItem(lineItemsDrawerMember.id)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-dashed border-rose-300 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
            >
              <HugeiconsIcon icon={Add01Icon} className="size-4" />
              {lineItemsMessages.addItem}
            </button>
          ) : null}

          {showLineItemsError &&
          drawerLineItems.some(
            (item) =>
              !item.description.trim() ||
              !Number.isFinite(Number(item.amount)) ||
              Number(item.amount) <= 0,
          ) ? (
            <p className="text-xs font-medium text-red-600">
              {lineItemsMessages.validation}
            </p>
          ) : null}
        </div>

        <div className="border-t border-gray-200 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-gray-600">
              {lineItemsMessages.total}
            </span>
            <span className="font-semibold tabular-nums text-gray-900">
              {formatMoney(
                currency,
                lineItemsDrawerMember
                  ? (lineItemTotalsByMember[lineItemsDrawerMember.id] ?? 0)
                  : 0,
              )}
            </span>
          </div>
          <Button
            type="button"
            className="h-12 w-full rounded-full bg-rose-500 text-white hover:bg-rose-500/90"
            onClick={() => setLineItemsDrawerMemberId(null)}
          >
            {lineItemsMessages.done}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
