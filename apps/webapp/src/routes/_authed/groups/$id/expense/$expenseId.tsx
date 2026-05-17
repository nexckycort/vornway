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
import { ArrowLeft, Pin, Trash2 } from 'lucide-react';
import { type PointerEvent, useMemo, useRef, useState } from 'react';

export const Route = createFileRoute('/_authed/groups/$id/expense/$expenseId')({
  component: RouteComponent,
});

function formatAmount(currency: string, amount: number): string {
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
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function RouteComponent() {
  const { id, expenseId } = Route.useParams();
  const navigate = useNavigate();
  const groupSummaryQuery = useGroupSummaryQuery(id);
  const expensesQuery = useGroupExpensesInfiniteQuery(id);
  const deleteExpenseMutation = useDeleteExpenseMutation(id);
  const toggleExpensePinMutation = useToggleExpensePinMutation();
  const pinnedExpenseIds = usePinnedExpenseIds(id);

  const [optionsDrawerOpen, setOptionsDrawerOpen] = useState(false);
  const [deleteDrawerOpen, setDeleteDrawerOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeError, setSwipeError] = useState<string | null>(null);

  const dragStateRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    latestOffset: 0,
    hasMoved: false,
  });
  const suppressNextClickRef = useRef(false);

  const expense = useMemo(() => {
    const items = expensesQuery.data?.pages.flatMap((page) => page.data) ?? [];
    return items.find((item) => item.id === expenseId) ?? null;
  }, [expenseId, expensesQuery.data]);

  const isPinned = expense ? pinnedExpenseIds.includes(expense.id) : false;

  const resetSwipe = () => {
    dragStateRef.current.active = false;
    dragStateRef.current.pointerId = -1;
    dragStateRef.current.startX = 0;
    dragStateRef.current.latestOffset = 0;
    setSwipeOffset(0);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    setSwipeError(null);
    dragStateRef.current.active = true;
    dragStateRef.current.pointerId = event.pointerId;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.latestOffset = 0;
    dragStateRef.current.hasMoved = false;
    suppressNextClickRef.current = false;
    setSwipeOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current.active) return;
    if (
      dragStateRef.current.pointerId !== -1 &&
      event.pointerId !== dragStateRef.current.pointerId
    ) {
      return;
    }

    const delta = event.clientX - dragStateRef.current.startX;
    const clamped = Math.max(Math.min(delta, 24), -132);

    dragStateRef.current.latestOffset = clamped;
    dragStateRef.current.hasMoved = Math.abs(clamped) > 8;
    setSwipeOffset(clamped);
  };

  const handlePointerEnd = () => {
    if (!dragStateRef.current.active) return false;

    const shouldOpenDrawer = dragStateRef.current.latestOffset <= -72;
    resetSwipe();

    if (shouldOpenDrawer) {
      setOptionsDrawerOpen(false);
      setDeleteDrawerOpen(true);
      suppressNextClickRef.current = true;
      return true;
    }

    return false;
  };

  const handleCardAction = () => {
    if (deleteDrawerOpen || swipeOffset !== 0 || dragStateRef.current.hasMoved) {
      dragStateRef.current.hasMoved = false;
      return;
    }

    setOptionsDrawerOpen(true);
  };

  const handleTogglePin = async () => {
    if (!expense) return;

    try {
      await toggleExpensePinMutation.mutateAsync({
        groupId: id,
        expenseId: expense.id,
      });
      setOptionsDrawerOpen(false);
    } catch (error) {
      setSwipeError(
        error instanceof Error ? error.message : 'No se pudo actualizar el pin',
      );
    }
  };

  const confirmDelete = async () => {
    if (!expense) return;

    setSwipeError(null);

    try {
      await deleteExpenseMutation.mutateAsync({
        groupId: id,
        expenseId: expense.id,
      });

      setDeleteDrawerOpen(false);
      await navigate({
        to: '/groups/$id',
        params: { id },
        replace: true,
      });
    } catch (error) {
      setSwipeError(
        error instanceof Error ? error.message : 'No se pudo eliminar el gasto',
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-10 pt-8">
        <header className="mb-5">
          <Link
            to="/groups/$id"
            params={{ id }}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </Link>
          <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">
            Detalle de gasto
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            {groupSummaryQuery.data?.name ?? 'Grupo'}
          </p>
        </header>

        {expensesQuery.isLoading ? (
          <p className="text-sm text-[#64748b]">Cargando gasto...</p>
        ) : null}

        {!expensesQuery.isLoading && !expense ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No encontramos este gasto en la página cargada. Vuelve al listado y
            ábrelo desde allí.
          </div>
        ) : null}

        {swipeError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {swipeError}
          </div>
        ) : null}

        {expense ? (
          <section className="mt-4">
            <div className="relative overflow-hidden rounded-[28px] border border-[#e2e8f0] bg-[#fee2e2] shadow-sm">
              <div className="absolute inset-y-0 right-0 flex items-center gap-2 px-5 text-sm font-semibold text-red-600">
                <Trash2 className="size-4" />
                Eliminar
              </div>

              <button
                type="button"
                className="relative z-10 block w-full touch-pan-y bg-white text-left transition-transform duration-200"
                style={{
                  transform: `translate3d(${swipeOffset}px, 0, 0)`,
                  transitionDuration: dragStateRef.current.active
                    ? '0ms'
                    : '200ms',
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={() => {
                  const openedDeleteDrawer = handlePointerEnd();
                  if (!openedDeleteDrawer && !suppressNextClickRef.current) {
                    handleCardAction();
                  }
                  suppressNextClickRef.current = false;
                }}
                onPointerCancel={handlePointerEnd}
                onClick={() => {
                  if (suppressNextClickRef.current) {
                    suppressNextClickRef.current = false;
                    return;
                  }

                  handleCardAction();
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-[#0f172a]">
                        {expense.description}
                      </h2>
                      <p className="mt-1 text-sm text-[#64748b]">
                        {formatDate(expense.date)}
                      </p>
                    </div>
                    <p className="text-3xl font-bold text-primary">
                      {formatAmount(expense.currency, expense.amount)}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4">
                    <Row label="Pagado por" value={expense.paidBy.name} />
                    <Row
                      label="Participantes"
                      value={String(expense.participantCount)}
                    />
                    <Row
                      label="Categoría"
                      value={expense.category?.name ?? 'Sin categoría'}
                    />
                    <Row label="Tipo" value={expense.expenseType} />
                    <Row
                      label="Estado"
                      value={expense.isDeleted ? 'Eliminado' : 'Activo'}
                    />
                    {expense.isSettlement ? (
                      <Row
                        label="Liquidación"
                        value={`Pagó a ${expense.settlementToName ?? 'otro miembro'}`}
                      />
                    ) : null}
                  </div>
                </div>
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <Drawer open={optionsDrawerOpen} onOpenChange={setOptionsDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Opciones del gasto</DrawerTitle>
            <DrawerDescription>{expense?.description}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-2 px-5 pb-5">
            <button
              type="button"
              onClick={() => setOptionsDrawerOpen(false)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
            >
              <ArrowLeft className="size-5 text-[#132238]" />
              <span className="font-medium text-[#132238]">Abrir</span>
            </button>

            {expense && !expense.isSettlement ? (
              <button
                type="button"
                onClick={handleTogglePin}
                disabled={
                    expense.isDeleted || toggleExpensePinMutation.isPending
                }
                className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left disabled:opacity-60"
              >
                <Pin
                  className={`size-5 ${
                    isPinned
                      ? 'fill-current text-amber-500'
                      : 'text-[#132238]'
                  }`}
                />
                <span className="font-medium text-[#132238]">
                  {isPinned ? 'Desfijar' : 'Fijar'}
                </span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setOptionsDrawerOpen(false);
                setDeleteDrawerOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
            >
              <Trash2 className="size-5 text-red-500" />
              <span className="font-medium text-red-500">Eliminar</span>
            </button>

            {toggleExpensePinMutation.error ? (
              <p className="text-sm text-red-500">
                {toggleExpensePinMutation.error instanceof Error
                  ? toggleExpensePinMutation.error.message
                  : 'No se pudo actualizar el pin'}
              </p>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={deleteDrawerOpen} onOpenChange={setDeleteDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Eliminar gasto</DrawerTitle>
            <DrawerDescription>
              Esta acción oculta el gasto y ajusta el total del grupo.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pb-2">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {expense ? (
                <>
                  Vas a eliminar <strong>{expense.description}</strong> por{' '}
                  <strong>
                    {formatAmount(expense.currency, expense.amount)}
                  </strong>
                  .
                </>
              ) : (
                'Vas a eliminar este gasto.'
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              variant="destructive"
              className="h-11 rounded-full"
              onClick={confirmDelete}
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
              onClick={() => setDeleteDrawerOpen(false)}
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f1f5f9] pb-3">
      <span className="text-sm text-[#64748b]">{label}</span>
      <span className="truncate text-sm font-semibold text-[#0f172a]">
        {value}
      </span>
    </div>
  );
}
