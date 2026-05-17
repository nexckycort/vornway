import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useDeleteExpenseMutation } from '#/routes/_authed/groups/-hooks/use-delete-expense';
import { useToggleExpensePinMutation } from '#/routes/_authed/groups/-hooks/use-toggle-expense-pin';
import {
  useGroupExpensesInfiniteQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { usePinnedExpenseIds } from '#/lib/expense-pins';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  BarChart3,
  Copy,
  ChevronRight,
  ArrowUpRight,
  MoreHorizontal,
  Pin,
  Plus,
  Share2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  type MouseEvent,
  type TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export const Route = createFileRoute('/_authed/groups/$id/')({
  component: RouteComponent,
});

type ExpenseItem = NonNullable<
  ReturnType<typeof useGroupExpensesInfiniteQuery>['data']
>['pages'][number]['data'][number];

function formatMoney(currency: string, amount: number): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function sumByCurrency(items: Array<{ currency: string; amount: number }>) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
    return acc;
  }, {});
}

type ExpenseDateGroup = {
  label: string;
  items: ExpenseItem[];
};

function formatTimelineDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getExpenseDateGroupLabel(value: string): string {
  const expenseDate = new Date(value);
  if (Number.isNaN(expenseDate.getTime())) return '';

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const expenseDay = new Date(
    expenseDate.getFullYear(),
    expenseDate.getMonth(),
    expenseDate.getDate(),
  ).getTime();
  const diffDays = Math.round((today - expenseDay) / 86_400_000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return formatTimelineDate(value);
}

function groupExpensesByDate(expenses: ExpenseItem[]): ExpenseDateGroup[] {
  const groups: ExpenseDateGroup[] = [];

  for (const expense of expenses) {
    const label = getExpenseDateGroupLabel(expense.date);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.label === label) {
      lastGroup.items.push(expense);
      continue;
    }

    groups.push({ label, items: [expense] });
  }

  return groups;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

type ExpenseRowTag = {
  label: string;
  tone: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate';
};

function getExpenseEmoji(expense: ExpenseItem): string {
  if (expense.isSettlement) return '🤝';
  if (expense.expenseType === 'composite') return '🧾';

  const text = `${expense.description} ${expense.category?.name ?? ''}`.toLowerCase();

  if (/(hotel|hostal|airbnb|estadia|estadía|lodg|aloj)/.test(text)) return '🏨';
  if (/(comida|cena|almuerzo|desayuno|rest|restaurant|caf[eé]|bar|snack)/.test(text)) {
    return '🍽️';
  }
  if (/(bus|vuelo|flight|taxi|uber|transporte|metro|tren|ticket|tickets)/.test(text)) {
    return '🎫';
  }

  return '💸';
}

function getExpenseRowTag(expense: ExpenseItem, isPinned: boolean): ExpenseRowTag | null {
  if (expense.isSettlement) {
    return { label: 'Liquidación', tone: 'emerald' };
  }

  if (expense.currentUserBalance !== null && expense.participantCount > 0) {
    if (expense.currentUserBalance > 0) {
      return {
        label: `Te deben ${formatMoney(expense.currency, expense.currentUserBalance)}`,
        tone: 'emerald',
      };
    }

    if (expense.currentUserBalance < 0) {
      return {
        label: `Debes ${formatMoney(expense.currency, Math.abs(expense.currentUserBalance))}`,
        tone: 'rose',
      };
    }
  }

  if (expense.expenseType === 'composite') {
    return {
      label: `${expense.subExpenseCount} subgasto${expense.subExpenseCount === 1 ? '' : 's'}`,
      tone: 'blue',
    };
  }

  if (isPinned) {
    return { label: 'Fijado', tone: 'amber' };
  }

  return null;
}

function ExpenseRow({
  expense,
  isPinned,
  onOpenExpense,
  onOpenOptions,
  onDeleteExpense,
}: {
  expense: ExpenseItem;
  isPinned: boolean;
  onOpenExpense: (expenseId: string) => void;
  onOpenOptions: (expense: ExpenseItem) => void;
  onDeleteExpense: (expense: ExpenseItem) => void;
}) {
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

  const showDeleteAction = !expense.isDeleted && translateX < -2;

  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const startLongPressTimeout = () => {
    clearLongPressTimeout();
    longPressTimeoutRef.current = setTimeout(() => {
      setDidLongPress(true);
      setDidSwipe(true);
      setTranslateX(0);
      onOpenOptions(expense);
    }, LONG_PRESS_MS);
  };

  const handleTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    if (expense.isDeleted) return;
    const touch = event.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setIsDragging(true);
    setDidSwipe(false);
    setDidLongPress(false);
    startLongPressTimeout();
  };

  const handleTouchMove = (event: TouchEvent<HTMLButtonElement>) => {
    if (!isDragging || startX === null || startY === null || expense.isDeleted) {
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
    if (!isDragging || expense.isDeleted) return;

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
    if (expense.isDeleted) return;
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

  return (
    <div
      className="relative mb-3 overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] last:mb-0"
    >
      {showDeleteAction && (
        <div className="absolute inset-y-0 right-0 z-0 flex w-[88px] items-center justify-center bg-[#ff4d6a]">
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-full w-full flex-col items-center justify-center text-white"
          >
            <Trash2 className="mb-1 size-5" />
            <span className="text-xs font-medium">Borrar</span>
          </button>
        </div>
      )}

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
          onOpenOptions(expense);
        }}
        className="native-tap relative z-10 flex w-full items-start gap-3 bg-white px-4 py-4 text-left transition-transform duration-200"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
            expense.isSettlement
              ? 'bg-emerald-100'
              : expense.expenseType === 'composite'
                ? 'bg-blue-100'
                : 'bg-[#f3f4f6]'
          }`}
        >
          <span className="text-base">
            {getExpenseEmoji(expense)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isPinned ? (
              <Pin className="size-3.5 shrink-0 fill-current text-amber-500" />
            ) : null}
            <p className="min-w-0 truncate text-sm font-semibold text-[#132238]">
              {expense.description}
            </p>
          </div>
          <p className="mt-1 text-xs text-[#64748b]">
            {expense.isSettlement
              ? `Pagado por ${expense.paidBy.name} · ${expense.settlementToName ?? 'otro miembro'}`
              : `Pagado por ${expense.paidBy.name}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-medium text-[#64748b]">
              {formatDate(expense.date)}
            </span>
            {expense.category ? (
              <span className="inline-flex rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-medium text-[#64748b]">
                {expense.category.name}
              </span>
            ) : null}
            {getExpenseRowTag(expense, isPinned) ? (
              <span
                className={
                  getExpenseRowTag(expense, isPinned)?.tone === 'emerald'
                    ? 'inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700'
                    : getExpenseRowTag(expense, isPinned)?.tone === 'rose'
                      ? 'inline-flex rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-600'
                      : getExpenseRowTag(expense, isPinned)?.tone === 'blue'
                        ? 'inline-flex rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700'
                        : getExpenseRowTag(expense, isPinned)?.tone === 'amber'
                          ? 'inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700'
                          : 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700'
                }
              >
                {getExpenseRowTag(expense, isPinned)?.label}
              </span>
            ) : null}
          </div>
        </div>
        <div className="ml-1 shrink-0 text-right">
          <p className="truncate text-base font-bold text-[#132238]">
            {formatMoney(expense.currency, expense.amount)}
          </p>
          <p className="truncate text-xs text-[#94a3b8]">
            {expense.isSettlement ? 'Liquidación' : expense.currency}
          </p>
        </div>
      </button>
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const balanceRef = useRef<HTMLElement | null>(null);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showExpenseOptionsDrawer, setShowExpenseOptionsDrawer] = useState(false);
  const [showDeleteExpenseDrawer, setShowDeleteExpenseDrawer] = useState(false);
  const [expenseForOptions, setExpenseForOptions] = useState<ExpenseItem | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const groupQuery = useGroupSummaryQuery(id);
  const expensesQuery = useGroupExpensesInfiniteQuery(id);
  const deleteExpenseMutation = useDeleteExpenseMutation(id);
  const toggleExpensePinMutation = useToggleExpensePinMutation();
  const pinnedExpenseIds = usePinnedExpenseIds(id);

  const expenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [expensesQuery.data],
  );
  const groupedExpenses = useMemo(
    () => groupExpensesByDate(expenses),
    [expenses],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!expensesQuery.hasNextPage || expensesQuery.isFetching) return;
        void expensesQuery.fetchNextPage();
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [expensesQuery]);

  if (groupQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#efefef] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] items-center justify-center bg-[#fafafa] px-4">
          <p className="text-sm text-[#64748b]">Cargando grupo...</p>
        </div>
      </main>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <main className="min-h-screen bg-[#efefef] text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col justify-center bg-[#fafafa] px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupQuery.error instanceof Error
              ? groupQuery.error.message
              : 'No tienes acceso a este grupo'}
          </div>
          <Link
            to="/groups"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Volver a grupos
          </Link>
        </div>
      </main>
    );
  }

  const group = groupQuery.data;
  const totalsEntries = Object.entries(group.totals).filter(
    ([, amount]) => Math.abs(amount) >= 0.01,
  );
  const primaryTotal = totalsEntries[0];
  const debtEntries = Object.entries(sumByCurrency(group.directDebts)).filter(
    ([, amount]) => amount > 0,
  );
  const creditEntries = Object.entries(sumByCurrency(group.directCredits)).filter(
    ([, amount]) => amount > 0,
  );
  const balanceLabel = creditEntries[0]
    ? `Te deben ${formatMoney(creditEntries[0][0], creditEntries[0][1])}`
    : debtEntries[0]
      ? `Debes ${formatMoney(debtEntries[0][0], debtEntries[0][1])}`
      : 'Sin saldos pendientes';
  const balanceTone = creditEntries[0]
    ? 'text-emerald-300'
    : debtEntries[0]
      ? 'text-rose-300'
      : 'text-white/70';
  const inviteLink =
    group.inviteCode && typeof window !== 'undefined'
      ? `${window.location.origin}/join/${group.inviteCode}`
      : '';

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setShareMessage(`${label} copiado`);
    } catch {
      setShareMessage('No se pudo copiar');
    }
  };

  const shareInvite = async () => {
    if (!inviteLink) return;
    try {
      if (navigator.share) {
        await navigator.share({ url: inviteLink });
        return;
      }
      await copyText(inviteLink, 'Enlace');
    } catch {
      setShareMessage('No se pudo compartir');
    }
  };

  const handleOpenExpense = (expenseId: string) => {
    void navigate({
      to: '/groups/$id/expense/$expenseId',
      params: { id, expenseId },
    });
  };

  const handleOpenExpenseOptions = (expense: ExpenseItem) => {
    setExpenseForOptions(expense);
    setShowExpenseOptionsDrawer(true);
  };

  const handleTogglePinnedExpense = async () => {
    if (!expenseForOptions) return;

    try {
      await toggleExpensePinMutation.mutateAsync({
        groupId: id,
        expenseId: expenseForOptions.id,
      });
      setShowExpenseOptionsDrawer(false);
      setExpenseForOptions(null);
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : 'No se pudo actualizar el pin',
      );
    }
  };

  const handleDeleteExpense = (expense: ExpenseItem) => {
    setExpenseToDelete(expense);
    setShowDeleteExpenseDrawer(true);
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;

    try {
      await deleteExpenseMutation.mutateAsync({
        groupId: id,
        expenseId: expenseToDelete.id,
      });
      setShowDeleteExpenseDrawer(false);
      setExpenseToDelete(null);
    } catch (error) {
      setShareMessage(
        error instanceof Error ? error.message : 'No se pudo eliminar el gasto',
      );
    }
  };

  const handleScrollToBalances = () => {
    balanceRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <main className="min-h-screen bg-[#111111] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#111111]">
        <header className="px-4 pb-6 pt-6 text-white">
          <div className="mb-5 flex items-start gap-3">
            <Link
              to="/groups"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
                Grupo
              </p>
              <h1 className="truncate text-xl font-semibold leading-7">
                {group.name}
              </h1>
              <p className="truncate text-sm text-white/55">
                {group.participantCount} participantes
                {group.description ? ` · ${group.description}` : ''}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreDrawer(true)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
              aria-label="Más opciones"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>

          <section className="rounded-[28px] bg-[#1f1f1f] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">
                {primaryTotal ? primaryTotal[0] : 'COP'}
              </span>
              <span className="text-xs text-white/45">Total del grupo</span>
            </div>

            <h2 className="mt-2 text-4xl font-bold tracking-tight text-white">
              {primaryTotal
                ? formatMoney(primaryTotal[0], Math.abs(primaryTotal[1]))
                : formatMoney('COP', 0)}
            </h2>

            <p className={`mt-2 text-sm font-medium ${balanceTone}`}>
              {balanceLabel}
            </p>

            {totalsEntries.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {totalsEntries.map(([currency, amount]) => (
                  <span
                    key={currency}
                    className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/70"
                  >
                    {formatMoney(currency, Math.abs(amount))}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Link
              to="/groups/$id/add-expense"
              params={{ id }}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-[#ff4d6a] text-white shadow-[0_8px_18px_rgba(255,77,106,0.35)]">
                <Plus className="size-6" />
              </span>
              <span className="text-center text-[11px] font-medium text-white/85">
                Crear gasto
              </span>
            </Link>

            <Link
              to="/groups/$id/settle"
              params={{ id }}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                <ArrowUpRight className="size-6" />
              </span>
              <span className="text-center text-[11px] font-medium text-white/85">
                Liquidar
              </span>
            </Link>

            <button
              type="button"
              onClick={handleScrollToBalances}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                <BarChart3 className="size-6" />
              </span>
              <span className="text-center text-[11px] font-medium text-white/85">
                Balance
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowMoreDrawer(true)}
              className="flex flex-col items-center gap-2"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
                <MoreHorizontal className="size-6" />
              </span>
              <span className="text-center text-[11px] font-medium text-white/85">
                Ajustes
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 rounded-t-[32px] bg-white px-4 pb-8 pt-6 shadow-[0_-16px_40px_rgba(0,0,0,0.12)]">
          <section className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Link
                to="/groups/$id/participants"
                params={{ id }}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#132238]"
              >
                Participantes
                <ChevronRight className="size-4 text-[#94a3b8]" />
              </Link>
              <span className="text-xs text-[#94a3b8]">
                {group.members.length} miembros
              </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              <Link
                to="/groups/$id/participants"
                params={{ id }}
                className="flex min-w-[62px] flex-col items-center gap-1"
              >
                <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-[#d1d5db] bg-white text-[#94a3b8]">
                  <Plus className="size-4" />
                </span>
                <span className="max-w-[62px] truncate text-[11px] text-[#64748b]">
                  Agregar
                </span>
              </Link>

              {group.members.slice(0, 6).map((member) => (
                <div
                  key={member.id}
                  className="flex min-w-[62px] flex-col items-center gap-1"
                >
                  <span className="flex size-12 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f8fafc] text-sm font-semibold text-[#132238]">
                    {getInitials(member.name)}
                  </span>
                  <span className="max-w-[62px] truncate text-[11px] text-[#64748b]">
                    {member.name}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
                Historial
              </h2>
              <span className="text-xs text-[#94a3b8]">
                {expenses.length} gastos
              </span>
            </div>

            {expensesQuery.isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {expensesQuery.error instanceof Error
                  ? expensesQuery.error.message
                  : 'No se pudieron cargar los gastos'}
              </div>
            ) : null}

            {!expensesQuery.isLoading && groupedExpenses.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] px-6 py-14 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#f3f4f6] text-2xl">
                  💸
                </div>
                <h3 className="text-base font-semibold text-[#132238]">
                  No tienes gastos aún
                </h3>
                <p className="mt-2 text-sm text-[#64748b]">
                  Crea tu primer gasto y empieza a organizar este grupo.
                </p>
              </div>
            ) : null}

            <div className="space-y-5">
              {groupedExpenses.map((dayGroup) => (
                <div key={dayGroup.label}>
                  <p className="mb-3 text-sm font-medium text-[#64748b]">
                    {dayGroup.label}
                  </p>
                  <div className="flex flex-col">
                    {dayGroup.items.map((expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        isPinned={pinnedExpenseIds.includes(expense.id)}
                        onOpenExpense={handleOpenExpense}
                        onOpenOptions={handleOpenExpenseOptions}
                        onDeleteExpense={handleDeleteExpense}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div ref={loadMoreRef} className="h-8" />

            {expensesQuery.isFetchingNextPage ? (
              <p className="text-center text-sm text-[#64748b]">
                Cargando más...
              </p>
            ) : null}
          </section>

          <section ref={balanceRef} className="scroll-mt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#132238]">
                Saldos
              </h2>
              <span className="text-xs text-[#94a3b8]">
                {group.memberBalances.length} personas
              </span>
            </div>

            {group.memberBalances.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] px-6 py-14 text-center">
                <h3 className="text-base font-semibold text-[#132238]">
                  Sin cuentas aún
                </h3>
                <p className="mt-2 text-sm text-[#64748b]">
                  Agrega gastos para ver el balance de cada participante.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {group.memberBalances.map((member) => {
                  const memberIdentity = group.members.find(
                    (item) => item.id === member.memberId,
                  );
                  const entries = Object.entries(member.balances).filter(
                    ([, amount]) => Math.abs(amount) >= 1,
                  );

                  return (
                    <article
                      key={member.memberId}
                      className="flex items-center gap-4 rounded-3xl border border-[#e5e7eb] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-base font-semibold text-[#132238]">
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#132238]">
                          {member.name}
                          {member.isCurrentUser ? (
                            <span className="ml-1 text-xs text-[#94a3b8]">
                              (tú)
                            </span>
                          ) : null}
                        </p>
                        <p className="truncate text-xs text-[#94a3b8]">
                          {memberIdentity?.email ?? 'Sin cuenta vinculada'}
                        </p>
                        {entries.length === 0 ? (
                          <p className="mt-1 text-xs text-[#94a3b8]">
                            Sin movimientos
                          </p>
                        ) : (
                          entries.map(([currency, amount]) => (
                            <p
                              key={currency}
                              className={
                                amount > 0
                                  ? 'mt-1 text-xs font-medium text-emerald-600'
                                  : 'mt-1 text-xs font-medium text-rose-600'
                              }
                            >
                              {amount > 0
                                ? `Le deben ${formatMoney(currency, amount)}`
                                : `Debe ${formatMoney(currency, Math.abs(amount))}`}
                            </p>
                          ))
                        )}
                      </div>
                      <div className="max-w-[112px] shrink-0 text-right">
                        {entries.map(([currency, amount]) => (
                          <p
                            key={currency}
                            className={
                              amount > 0
                                ? 'truncate text-sm font-semibold text-emerald-600'
                                : 'truncate text-sm font-semibold text-rose-600'
                            }
                          >
                            {amount > 0 ? '+' : ''}
                            {formatMoney(currency, amount)}
                          </p>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      <Drawer open={showMoreDrawer} onOpenChange={setShowMoreDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Más opciones</DrawerTitle>
            <DrawerDescription>{group.name}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 px-5 pb-5">
            <button
              type="button"
              onClick={shareInvite}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
            >
              <Share2 className="size-5 text-primary" />
              <span className="font-medium text-[#132238]">
                Compartir grupo
              </span>
            </button>

            <button
              type="button"
              onClick={() => copyText(group.inviteCode, 'Código')}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
            >
              <Copy className="size-5 text-primary" />
              <span className="font-medium text-[#132238]">Copiar código</span>
            </button>

            <Link
              to="/groups/$id/participants"
              params={{ id }}
              onClick={() => setShowMoreDrawer(false)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
            >
              <UserPlus className="size-5 text-primary" />
              <span className="font-medium text-[#132238]">Participantes</span>
            </Link>

            <div className="rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4">
              <p className="mb-2 text-sm font-medium text-[#132238]">Totales</p>
              {Object.entries(group.totals).length === 0 ? (
                <p className="text-sm text-[#64748b]">Sin gastos</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(group.totals).map(([currency, total]) => (
                    <p key={currency} className="text-sm text-[#64748b]">
                      {formatMoney(currency, total)}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {shareMessage ? (
              <p className="rounded-2xl bg-[#f8fafc] px-4 py-3 text-sm text-[#64748b]">
                {shareMessage}
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full"
              onClick={() => setShowMoreDrawer(false)}
            >
              Cerrar
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showExpenseOptionsDrawer && Boolean(expenseForOptions)}
        onOpenChange={(open) => {
          if (!open) {
            setShowExpenseOptionsDrawer(false);
            setExpenseForOptions(null);
          } else {
            setShowExpenseOptionsDrawer(true);
          }
        }}
      >
        <DrawerContent>
          {expenseForOptions ? (
            <>
              <DrawerHeader>
                <DrawerTitle>Opciones del gasto</DrawerTitle>
                <DrawerDescription>
                  {expenseForOptions.description}
                </DrawerDescription>
              </DrawerHeader>

              <div className="space-y-2 px-5 pb-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpenseOptionsDrawer(false);
                    setExpenseForOptions(null);
                    handleOpenExpense(expenseForOptions.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
                >
                  <ArrowLeft className="size-5 text-[#132238]" />
                  <span className="font-medium text-[#132238]">Abrir</span>
                </button>

                {!expenseForOptions.isSettlement ? (
                  <button
                    type="button"
                    onClick={handleTogglePinnedExpense}
                    disabled={
                      expenseForOptions.isDeleted ||
                      toggleExpensePinMutation.isPending
                    }
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left disabled:opacity-60"
                  >
                    <Pin
                      className={`size-5 ${
                        pinnedExpenseIds.includes(expenseForOptions.id)
                          ? 'fill-current text-amber-500'
                          : 'text-[#132238]'
                      }`}
                    />
                    <span className="font-medium text-[#132238]">
                      {pinnedExpenseIds.includes(expenseForOptions.id)
                        ? 'Desfijar'
                        : 'Fijar'}
                    </span>
                  </button>
                ) : null}

                {!expenseForOptions.isDeleted ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpenseOptionsDrawer(false);
                      setExpenseForOptions(null);
                      handleDeleteExpense(expenseForOptions);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
                  >
                    <Trash2 className="size-5 text-red-500" />
                    <span className="font-medium text-red-500">Eliminar</span>
                  </button>
                ) : null}

                {toggleExpensePinMutation.error ? (
                  <p className="text-sm text-red-500">
                    {toggleExpensePinMutation.error instanceof Error
                      ? toggleExpensePinMutation.error.message
                      : 'No se pudo actualizar el pin'}
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={showDeleteExpenseDrawer && Boolean(expenseToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setShowDeleteExpenseDrawer(false);
            setExpenseToDelete(null);
          } else {
            setShowDeleteExpenseDrawer(true);
          }
        }}
      >
        <DrawerContent>
          {expenseToDelete ? (
            <>
              <DrawerHeader>
                <DrawerTitle>Eliminar gasto</DrawerTitle>
                <DrawerDescription>
                  Se eliminará este gasto del grupo.
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-5 pb-2">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Vas a eliminar <strong>{expenseToDelete.description}</strong>{' '}
                  por <strong>{formatMoney(expenseToDelete.currency, expenseToDelete.amount)}</strong>.
                </div>
              </div>

              <DrawerFooter>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 rounded-full"
                  onClick={handleConfirmDeleteExpense}
                  disabled={deleteExpenseMutation.isPending}
                >
                  {deleteExpenseMutation.isPending
                    ? 'Eliminando...'
                    : 'Sí, eliminar gasto'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => {
                    setShowDeleteExpenseDrawer(false);
                    setExpenseToDelete(null);
                  }}
                >
                  Cancelar
                </Button>
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </main>
  );
}
