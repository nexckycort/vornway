import { ArrowRight, Clock3, HandCoins, Pin, Trash2 } from 'lucide-react';
import { type MouseEvent, type TouchEvent, useRef, useState } from 'react';

import type { ExpenseItem } from '../-types/group-detail.types';
import {
  formatMoney,
  getExpenseEmoji,
  getExpenseRowTag,
} from './group-detail.utils';

type GroupExpenseRowProps = {
  expense: ExpenseItem;
  isPinned: boolean;
  onOpenExpense: (expenseId: string) => void;
  onOpenOptions: (expense: ExpenseItem) => void;
  onDeleteExpense: (expense: ExpenseItem) => void;
};

const tagToneClass = {
  emerald:
    'border-emerald-200/70 bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
  rose: 'border-rose-200/70 bg-rose-50 text-rose-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
  blue: 'border-blue-200/70 bg-blue-50 text-blue-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
  amber:
    'border-amber-200/70 bg-amber-50 text-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
  slate:
    'border-slate-200/70 bg-slate-50 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]',
};

export function GroupExpenseRow({
  expense,
  isPinned,
  onOpenExpense,
  onOpenOptions,
  onDeleteExpense,
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

    const nextTranslateX = Math.max(-SWIPE_WIDTH, Math.min(0, deltaX));
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

    if (shouldTriggerDelete) {
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

    onOpenExpense(expense.id);
  };

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDeleteExpense(expense);
    setTranslateX(0);
  };

  const tag = getExpenseRowTag(expense, isPinned);

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border shadow-[0_14px_34px_rgba(15,23,42,0.07)] ${
        isSettlement
          ? 'border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white'
          : isPendingSync
            ? 'border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white'
            : 'border-white bg-white'
      }`}
    >
      {showDeleteAction ? (
        <div className="absolute inset-y-0 right-0 z-0 flex w-[88px] items-center justify-center bg-gradient-to-b from-[#ff4d6a] to-[#e11d48]">
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
        className={`native-tap relative z-10 flex w-full items-start gap-3 px-4 py-4 text-left transition-transform duration-200 ${
          isSettlement
            ? 'bg-gradient-to-br from-emerald-50 via-white to-white'
            : isPendingSync
              ? 'bg-gradient-to-br from-amber-50 via-white to-white'
              : 'bg-white'
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {isSettlement ? (
          <span className="absolute inset-y-5 left-0 w-1 rounded-r-full bg-emerald-400" />
        ) : null}
        {isPinned ? (
          <span className="absolute right-4 top-0 h-8 w-5 rounded-b-full bg-amber-400 shadow-[0_8px_18px_rgba(245,158,11,0.24)]" />
        ) : null}
        <div
          className={`relative flex size-12 shrink-0 items-center justify-center overflow-hidden ${
            isSettlement
              ? 'rounded-[20px] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_12px_24px_rgba(5,150,105,0.24)]'
              : expense.expenseType === 'composite'
                ? 'rounded-[20px] bg-gradient-to-br from-sky-100 to-blue-100 text-blue-700'
                : 'rounded-[20px] bg-gradient-to-br from-[#f8fafc] to-[#e2e8f0] text-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
          }`}
        >
          <span className="absolute inset-x-2 top-1 h-3 rounded-full bg-white/45 blur-sm" />
          {isSettlement ? (
            <HandCoins className="relative size-5" />
          ) : (
            <span className="relative text-lg">{getExpenseEmoji(expense)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 pr-4">
            {isPinned ? (
              <Pin className="size-3.5 shrink-0 fill-current text-amber-500" />
            ) : null}
            <p className="min-w-0 truncate text-[15px] font-semibold leading-5 tracking-[-0.01em] text-[#132238]">
              {expense.description}
            </p>
          </div>
          {isSettlement ? (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs font-medium text-emerald-700">
              <span className="truncate">{expense.paidBy.name}</span>
              <ArrowRight className="size-3 shrink-0" />
              <span className="truncate">
                {expense.settlementToName ?? 'otro miembro'}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-xs leading-5 text-[#64748b]">
              Pagado por {expense.paidBy.name}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {expense.category && !isSettlement ? (
              <span className="inline-flex rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-medium text-[#64748b]">
                {expense.category.name}
              </span>
            ) : null}
            {tag && !isSettlement ? (
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tagToneClass[tag.tone]}`}
              >
                {tag.label}
              </span>
            ) : null}
            {isPendingSync ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                <Clock3 className="size-3" />
                Pendiente
              </span>
            ) : null}
          </div>
        </div>
        <div className="ml-1 shrink-0 text-right">
          <p
            className={`truncate text-[15px] font-bold tracking-[-0.01em] ${
              isSettlement ? 'text-emerald-700' : 'text-[#132238]'
            }`}
          >
            {formatMoney(expense.currency, expense.amount)}
          </p>
          <p
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isSettlement ? 'font-medium text-emerald-600' : 'text-[#94a3b8]'
            }`}
          >
            {isSettlement ? 'Saldo pagado' : expense.currency}
          </p>
        </div>
      </button>
    </div>
  );
}
