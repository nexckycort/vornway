import {
  ArrowRight,
  Clock3,
  HandCoins,
  Pencil,
  Pin,
  Trash2,
} from 'lucide-react';
import { type MouseEvent, type TouchEvent, useRef, useState } from 'react';

import type { ExpenseItem } from '../-types/group-detail.types';
import { CategoryIcon } from './category-icon';
import { formatMoney, getExpenseEmoji } from './group-detail.utils';

type GroupExpenseRowProps = {
  expense: ExpenseItem;
  isPinned: boolean;
  onOpenExpense: (expenseId: string) => void;
  onOpenOptions: (expense: ExpenseItem) => void;
  onDeleteExpense: (expense: ExpenseItem) => void;
  onEditExpense: (expense: ExpenseItem) => void;
};

const iconToneClass = {
  settlement: 'bg-emerald-50 text-emerald-700',
  composite: 'bg-blue-50 text-blue-700',
  default: 'bg-teal-50 text-teal-700',
};

export function GroupExpenseRow({
  expense,
  isPinned,
  onOpenExpense,
  onOpenOptions,
  onDeleteExpense,
  onEditExpense,
}: GroupExpenseRowProps) {
  const SWIPE_WIDTH = 88;
  const SWIPE_THRESHOLD = 44;
  const FULL_SWIPE_THRESHOLD = 78;
  const LONG_PRESS_MS = 450;
  const [translateX, setTranslateX] = useState(0);
  const [startX, setStartX] = useState<number | null>(null);
  const [startY, setStartY] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [didSwipe, setDidSwipe] = useState(false);
  const [didLongPress, setDidLongPress] = useState(false);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const isPendingSync = expense.syncStatus === 'pending';
  const showDeleteAction = !expense.isDeleted && translateX < -2;
  const showEditAction =
    !expense.isDeleted && !expense.isSettlement && translateX > 2;
  const isSettlement = expense.isSettlement;

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const startLongPressTimeout = () => {
    if (isPendingSync) return;
    clearLongPressTimeout();
    longPressTimeoutRef.current = setTimeout(() => {
      setDidLongPress(true);
      setDidSwipe(true);
      setTranslateX(0);
      onOpenOptions(expense);
    }, LONG_PRESS_MS);
  };

  const handleTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    if (expense.isDeleted || isPendingSync) return;
    const touch = event.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setIsDragging(true);
    setDidSwipe(false);
    setDidLongPress(false);
    startLongPressTimeout();
  };

  const handleTouchMove = (event: TouchEvent<HTMLButtonElement>) => {
    if (
      !isDragging ||
      startX === null ||
      startY === null ||
      expense.isDeleted ||
      isPendingSync
    ) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      clearLongPressTimeout();
      return;
    }

    const maxRightSwipe = expense.isSettlement ? 0 : SWIPE_WIDTH;
    const nextTranslateX = Math.max(
      -SWIPE_WIDTH,
      Math.min(maxRightSwipe, deltaX),
    );
    if (Math.abs(nextTranslateX) > 6) {
      setDidSwipe(true);
      clearLongPressTimeout();
    }
    setTranslateX(nextTranslateX);
  };

  const handleTouchEnd = () => {
    clearLongPressTimeout();
    if (!isDragging || expense.isDeleted || isPendingSync) return;

    if (didLongPress) {
      setIsDragging(false);
      setStartX(null);
      setStartY(null);
      setDidLongPress(false);
      return;
    }

    const shouldTriggerDelete = translateX <= -FULL_SWIPE_THRESHOLD;
    const shouldOpenActions = translateX <= -SWIPE_THRESHOLD;
    const shouldTriggerEdit =
      !expense.isSettlement && translateX >= FULL_SWIPE_THRESHOLD;

    if (shouldTriggerEdit) {
      setTranslateX(0);
      onEditExpense(expense);
    } else if (shouldTriggerDelete) {
      setTranslateX(0);
      onDeleteExpense(expense);
    } else if (shouldOpenActions) {
      setTranslateX(-SWIPE_WIDTH);
    } else {
      setTranslateX(0);
    }

    setIsDragging(false);
    setStartX(null);
    setStartY(null);
  };

  const handleMouseDown = () => {
    if (expense.isDeleted || isPendingSync) return;
    setDidLongPress(false);
    startLongPressTimeout();
  };

  const handleMouseUp = () => {
    clearLongPressTimeout();
  };

  const handleOpenExpense = () => {
    if (didSwipe) {
      setDidSwipe(false);
      return;
    }

    if (isPendingSync) return;

    if (didLongPress) {
      setDidLongPress(false);
      return;
    }

    if (translateX <= -SWIPE_THRESHOLD) {
      setTranslateX(0);
      return;
    }

    if (translateX >= SWIPE_THRESHOLD) {
      setTranslateX(0);
      return;
    }

    onOpenExpense(expense.id);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDeleteExpense(expense);
    setTranslateX(0);
  };

  const iconTone = isSettlement
    ? iconToneClass.settlement
    : expense.expenseType === 'composite'
      ? iconToneClass.composite
      : iconToneClass.default;
  const paidByMembers =
    expense.paidByMembers.length > 0
      ? expense.paidByMembers
      : [
          {
            memberId: expense.paidBy.id,
            name: expense.paidBy.name,
            amount: expense.amount,
          },
        ];
  const paidBySummary =
    paidByMembers.length === 1
      ? (paidByMembers[0]?.name ?? expense.paidBy.name)
      : `${paidByMembers
          .slice(0, 2)
          .map((payer) => payer.name)
          .join(
            ', ',
          )}${paidByMembers.length > 2 ? ` · +${paidByMembers.length - 2}` : ''}`;
  const userBalance =
    !isSettlement && typeof expense.currentUserBalance === 'number'
      ? expense.currentUserBalance
      : null;
  const balanceLabel =
    userBalance === null || Math.abs(userBalance) < 0.01
      ? null
      : userBalance > 0
        ? `Te deben ${formatMoney(expense.currency, userBalance)}`
        : `Tú debes ${formatMoney(expense.currency, Math.abs(userBalance))}`;

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${
        isSettlement
          ? 'border-emerald-100 bg-emerald-50'
          : isPendingSync
            ? 'border-amber-100 bg-amber-50'
            : 'border-[#e5e7eb] bg-white'
      }`}
    >
      {showDeleteAction ? (
        <div className="absolute inset-y-0 right-0 z-0 flex w-[88px] items-center justify-center bg-primary">
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-full w-full flex-col items-center justify-center text-white"
          >
            <Trash2 className="mb-1 size-5" />
            <span className="text-xs font-medium">Borrar</span>
          </button>
        </div>
      ) : null}

      {showEditAction ? (
        <div className="absolute inset-y-0 left-0 z-0 flex w-[88px] items-center justify-center bg-[#0f172a]">
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <Pencil className="mb-1 size-5" />
            <span className="text-xs font-medium">Editar</span>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleOpenExpense}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(event) => {
          event.preventDefault();
          if (isPendingSync) return;
          onOpenOptions(expense);
        }}
        className={`native-tap relative z-10 flex w-full flex-col px-4 pt-2 pb-0 text-left transition-transform duration-200 ${
          isSettlement
            ? 'bg-emerald-50'
            : isPendingSync
              ? 'bg-amber-50'
              : 'bg-white'
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {isSettlement ? (
          <span className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-emerald-500" />
        ) : null}
        {isPinned ? (
          <span className="absolute right-4 top-0 h-7 w-4 rounded-b-full bg-amber-400" />
        ) : null}
        <div className="flex items-center gap-3.5">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconTone}`}
          >
            {isSettlement ? (
              <HandCoins className="size-4.5" />
            ) : (
              <CategoryIcon
                icon={expense.category?.icon}
                color={expense.category?.color}
                fallback={
                  <span className="text-xl">{getExpenseEmoji(expense)}</span>
                }
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isPinned ? (
                    <Pin className="size-3.5 shrink-0 fill-current text-amber-500" />
                  ) : null}
                  <p className="min-w-0 truncate text-base font-semibold text-[#202124]">
                    {expense.description}
                  </p>
                </div>
                {isSettlement ? (
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <span className="truncate">{expense.paidBy.name}</span>
                    <ArrowRight className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {expense.settlementToName ?? 'otro miembro'}
                    </span>
                  </div>
                ) : (
                  <p className="mt-0.5 truncate text-xs leading-5 text-[#555555]">
                    Pagado por {paidBySummary}
                    {expense.participantCount > 0
                      ? ` · ${expense.participantCount} persona${expense.participantCount === 1 ? '' : 's'}`
                      : ''}
                  </p>
                )}
              </div>

              <div className="shrink-0 self-center text-right">
                <p className="truncate text-base font-semibold text-[#202124]">
                  {formatMoney(expense.currency, expense.amount)}
                </p>
                {balanceLabel ? (
                  <p
                    className={`mt-0.5 text-xs font-medium ${
                      userBalance && userBalance > 0
                        ? 'text-red-500'
                        : 'text-teal-600'
                    }`}
                  >
                    {balanceLabel}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-1.5 space-y-2 pb-0.5">
          {isPendingSync ? (
            <span className="inline-flex items-center gap-1 rounded-xl bg-white/70 px-4 py-1.5 text-sm font-semibold text-amber-700">
              <Clock3 className="size-3" />
              Pendiente
            </span>
          ) : null}
        </div>
      </button>
    </div>
  );
}
