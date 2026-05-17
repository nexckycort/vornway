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
  HandCoins,
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

function TotalsDisplay({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals).filter(([, amount]) => amount > 0);

  if (entries.length === 0) {
    return (
      <div className="mx-auto mb-3 max-w-xs rounded-2xl bg-[#f6f7ff] px-4 py-3 text-center">
        <p className="text-2xl font-semibold leading-tight text-[#132238]">
          {formatMoney('COP', 0)}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-3 max-w-xs rounded-2xl bg-[#f6f7ff] px-4 py-3 text-center">
      {entries.map(([currency, amount], index) => (
        <p
          key={currency}
          className={
            index === 0
              ? 'text-2xl font-semibold leading-tight text-[#132238]'
              : 'mt-1 text-base font-medium text-[#64748b]'
          }
        >
          {formatMoney(currency, amount)}
        </p>
      ))}
    </div>
  );
}

function UserBalanceSummary({
  directDebts,
  directCredits,
}: {
  directDebts: Array<{ currency: string; amount: number }>;
  directCredits: Array<{ currency: string; amount: number }>;
}) {
  const debtByCurrency = sumByCurrency(directDebts);
  const creditByCurrency = sumByCurrency(directCredits);
  const debtEntries = Object.entries(debtByCurrency).filter(
    ([, amount]) => amount >= 1,
  );
  const creditEntries = Object.entries(creditByCurrency).filter(
    ([, amount]) => amount >= 1,
  );

  if (debtEntries.length === 0 && creditEntries.length === 0) {
    return (
      <p className="mb-5 text-center text-sm text-[#64748b]">Sin deudas</p>
    );
  }

  return (
    <div className="mb-5 space-y-1 text-center">
      {debtEntries.map(([currency, amount]) => (
        <p
          key={`debt-${currency}`}
          className="text-sm font-semibold text-red-500"
        >
          Debes {formatMoney(currency, amount)}
        </p>
      ))}
      {creditEntries.map(([currency, amount]) => (
        <p
          key={`credit-${currency}`}
          className="text-sm font-semibold text-emerald-600"
        >
          Te deben {formatMoney(currency, amount)}
        </p>
      ))}
    </div>
  );
}

function sumByCurrency(items: Array<{ currency: string; amount: number }>) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
    return acc;
  }, {});
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
      className={`relative mb-2 overflow-hidden rounded-2xl border px-3 last:mb-0 ${
        expense.isSettlement ? 'border-emerald-200' : 'border-gray-200'
      }`}
    >
      {showDeleteAction && (
        <div className="absolute inset-y-0 right-0 z-0 flex w-[88px] items-center justify-center bg-red-500">
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
        className={`native-tap relative z-10 flex w-full items-center gap-4 py-2 text-left transition-transform duration-200 ${
          expense.isSettlement ? 'bg-emerald-50' : 'bg-white'
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
      >
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
            expense.isSettlement
              ? 'bg-emerald-100'
              : expense.expenseType === 'composite'
                ? 'bg-blue-100'
                : 'bg-[#f0f0ff]'
          }`}
        >
          <span className="text-lg">
            {expense.isSettlement
              ? '🤝'
              : expense.expenseType === 'composite'
                ? '🧾'
                : '💰'}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {isPinned ? (
              <Pin className="size-3.5 fill-current text-amber-500" />
            ) : null}
            <p className="min-w-0 truncate font-medium text-[#1a1a3e]">
              {expense.description}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {expense.isSettlement ? (
              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Liquidación
              </span>
            ) : expense.expenseType === 'composite' ? (
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                {expense.subExpenseCount} subgasto
                {expense.subExpenseCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-500">
            {formatDate(expense.date)}
            {expense.category ? ` · ${expense.category.name}` : ''}
            {expense.participantCount > 0 &&
              ` · ${expense.participantCount} participantes`}
          </p>
          <p
            className={`text-sm ${
              expense.isSettlement ? 'text-emerald-700' : 'text-gray-500'
            }`}
          >
            {expense.isSettlement
              ? `${expense.paidBy.name} pago a ${expense.settlementToName ?? 'otro miembro'}`
              : `Pago: ${expense.paidBy.name}`}
          </p>
        </div>
        <div className="max-w-[116px] shrink-0 text-right">
          <p className="truncate text-sm font-semibold text-[#132238]">
            {formatMoney(expense.currency, expense.amount)}
          </p>
          {!expense.isSettlement &&
          expense.participantCount > 0 &&
          expense.currentUserBalance !== null ? (
            <p
              className={
                expense.currentUserBalance > 0
                  ? 'truncate text-xs font-medium text-emerald-600'
                  : expense.currentUserBalance < 0
                    ? 'truncate text-xs font-medium text-red-500'
                    : 'truncate text-xs font-medium text-[#64748b]'
              }
            >
              {expense.currentUserBalance > 0
                ? `Te deben ${formatMoney(expense.currency, expense.currentUserBalance)}`
                : expense.currentUserBalance < 0
                  ? `Debes ${formatMoney(expense.currency, Math.abs(expense.currentUserBalance))}`
                  : 'Al día'}
            </p>
          ) : (
            <p className="truncate text-xs text-[#64748b]">
              {expense.isSettlement ? 'Liquidación' : expense.currency}
            </p>
          )}
        </div>
      </button>
    </div>
  );
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'gastos' | 'cuentas'>('gastos');
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

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto min-h-screen w-full max-w-[412px] bg-[#fafafa] pb-10">
        <header className="bg-[#f2f4ff] px-4 pb-4 pt-8">
          <Link
            to="/groups"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold leading-8 text-[#132238]">
                {group.name}
              </h1>
              <p className="text-sm text-[#64748b]">
                {group.participantCount} participantes
              </p>
            </div>
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#132238] shadow-sm"
              aria-label="Compartir grupo"
            >
              <Share2 className="size-5" />
            </button>
          </div>

          <section className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#64748b]">
              Total gastado
            </p>
            <TotalsDisplay totals={group.totals} />
            <UserBalanceSummary
              directDebts={group.directDebts}
              directCredits={group.directCredits}
            />
          </section>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              {
                label: 'Crear',
                icon: Plus,
                primary: true,
                to: '/groups/$id/add-expense' as const,
              },
              {
                label: 'Liquidar',
                icon: HandCoins,
                to: '/groups/$id/settle' as const,
              },
              {
                label: 'Personas',
                icon: UserPlus,
                to: '/groups/$id/participants' as const,
              },
              {
                label: 'Mas',
                icon: MoreHorizontal,
                action: 'drawer' as const,
              },
            ].map((action) => {
              const Icon = action.icon;
              if ('action' in action) {
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => setShowMoreDrawer(true)}
                    className="flex flex-col items-center gap-2"
                  >
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-[#132238]">
                      <Icon className="size-6" />
                    </span>
                    <span className="text-center text-xs text-[#132238]">
                      {action.label}
                    </span>
                  </button>
                );
              }
              return (
                <Link
                  key={action.label}
                  to={action.to}
                  params={{ id }}
                  className="flex flex-col items-center gap-2"
                >
                  <span
                    className={
                      action.primary
                        ? 'flex size-14 items-center justify-center rounded-2xl bg-primary text-white'
                        : 'flex size-14 items-center justify-center rounded-2xl bg-white text-[#132238]'
                    }
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className="text-center text-xs text-[#132238]">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </header>

        <section className="bg-white px-4 py-3">
          <div className="grid grid-cols-2 rounded-2xl bg-[#f8fafc] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('gastos')}
              className={
                activeTab === 'gastos'
                  ? 'rounded-xl bg-[#ecefff] py-3 text-sm font-bold text-primary shadow-sm'
                  : 'rounded-xl py-3 text-sm text-[#64748b]'
              }
            >
              Gastos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cuentas')}
              className={
                activeTab === 'cuentas'
                  ? 'rounded-xl bg-[#ecefff] py-3 text-sm font-bold text-primary shadow-sm'
                  : 'rounded-xl py-3 text-sm text-[#64748b]'
              }
            >
              Cuentas
            </button>
          </div>
        </section>

        {activeTab === 'gastos' ? (
          <section className="px-4 py-3">
            {expensesQuery.isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {expensesQuery.error instanceof Error
                  ? expensesQuery.error.message
                  : 'No se pudieron cargar los gastos'}
              </div>
            ) : null}

            {!expensesQuery.isLoading && expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary text-white">
                  <Plus className="size-8" />
                </div>
                <h2 className="text-lg font-semibold text-[#132238]">
                  No tienes gastos aún
                </h2>
                <p className="mt-2 text-sm text-[#64748b]">
                  Ingresa tus primeros gastos y comienza a dividirlos.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              {expenses.map((expense) => (
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

            <div ref={loadMoreRef} className="h-8" />

            {expensesQuery.isFetchingNextPage ? (
              <p className="text-center text-sm text-[#64748b]">
                Cargando más...
              </p>
            ) : null}
          </section>
        ) : (
          <section className="px-4 py-3">
            {group.memberBalances.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <h2 className="text-lg font-semibold text-[#132238]">
                  Sin cuentas aún
                </h2>
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
                      className="flex items-center gap-4 rounded-2xl border border-[#e2e8f0] bg-white px-3 py-3"
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f0f0ff] text-lg font-semibold text-primary">
                        {member.name.charAt(0).toUpperCase()}
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
                                  : 'mt-1 text-xs font-medium text-red-500'
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
                                : 'truncate text-sm font-semibold text-red-500'
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
        )}

        <div className="px-4 pt-3">
          <Link
            to="/groups/$id"
            params={{ id }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#e2e8f0] bg-white text-sm font-semibold text-[#132238]"
          >
            <BarChart3 className="size-4" />
            Ver resumen
          </Link>
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
