import { Delete02Icon, PencilIcon, PinIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Drawer, DrawerContent } from '#/components/ui/drawer';
import { getGroupDetailMessages } from '../-messages';
import type { ExpenseItem } from '../-types/group-detail.types';
import { CategoryIcon } from './category-icon';
import { formatMoney } from './group-detail.utils';

export function ExpenseOptionsDrawer({
  open,
  expense,
  isPinned,
  isPinPending,
  pinError,
  onClose,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  open: boolean;
  expense: ExpenseItem | null;
  isPinned: boolean;
  isPinPending: boolean;
  pinError: Error | null;
  onClose: () => void;
  onEdit: (expense: ExpenseItem) => void;
  onDelete: (expense: ExpenseItem) => void;
  onTogglePin: () => void;
}) {
  const t = getGroupDetailMessages();

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DrawerContent>
        {expense ? (
          <div className="space-y-3 px-5 pb-5 pt-4">
            <div className="rounded-[20px] border border-[#e2e8f0] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eeeeee] text-[#202124]">
                  <CategoryIcon
                    icon={expense.category?.icon}
                    color={expense.category?.color}
                    fallback={<span className="text-lg">💸</span>}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#132238]">
                        {expense.description}
                      </p>
                      <p className="truncate text-xs text-[#64748b]">
                        Pagado por {expense.paidBy.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-[#202124]">
                        {formatMoney(expense.currency, expense.amount)}
                      </p>
                      {expense.currentUserBalance !== null ? (
                        <p
                          className={`text-xs font-medium ${
                            expense.currentUserBalance > 0
                              ? 'text-emerald-500'
                              : expense.currentUserBalance < 0
                                ? 'text-red-500'
                                : 'text-[#64748b]'
                          }`}
                        >
                          {expense.currentUserBalance > 0
                            ? `Te deben ${formatMoney(
                                expense.currency,
                                expense.currentUserBalance,
                              )}`
                            : expense.currentUserBalance < 0
                              ? `Tú debes ${formatMoney(
                                  expense.currency,
                                  Math.abs(expense.currentUserBalance),
                                )}`
                              : 'Sin saldo'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!expense.isDeleted && !expense.isSettlement ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="flex w-full items-center gap-3 rounded-2xl p-1 text-left"
              >
                <HugeiconsIcon
                  icon={PencilIcon}
                  className="size-5 text-[#202124]"
                />
                <span className="font-medium text-[#132238]">Editar gasto</span>
              </button>
            ) : null}

            {!expense.isSettlement ? (
              <button
                type="button"
                onClick={onTogglePin}
                disabled={expense.isDeleted || isPinPending}
                className="flex w-full items-center gap-3 rounded-2xl p-1 text-left disabled:opacity-60"
              >
                <HugeiconsIcon
                  icon={PinIcon}
                  className="size-5 text-[#202124]"
                />
                <span className="font-medium text-[#132238]">
                  {isPinned ? 'Desfijar' : 'Fijar'}
                </span>
              </button>
            ) : null}

            {!expense.isDeleted ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(expense);
                }}
                className="flex w-full items-center gap-3 rounded-2xl p-1 text-left"
              >
                <HugeiconsIcon
                  icon={Delete02Icon}
                  className="size-5 text-red-500"
                />
                <span className="font-medium text-red-500">
                  {t.detail.delete}
                </span>
              </button>
            ) : null}

            {pinError ? (
              <p className="text-sm text-red-500">
                {pinError instanceof Error
                  ? pinError.message
                  : t.detail.pinFailed}
              </p>
            ) : null}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
