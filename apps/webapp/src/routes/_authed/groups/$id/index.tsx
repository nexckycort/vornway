import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { usePinnedExpenseIds } from '#/lib/expense-pins';
import { useDeleteExpenseMutation } from '#/routes/_authed/groups/-hooks/use-delete-expense';
import {
  useGroupExpensesInfiniteQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { useToggleExpensePinMutation } from '#/routes/_authed/groups/-hooks/use-toggle-expense-pin';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Copy, Pencil, Share2, Trash2, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { GroupBalancesSection } from './-components/group-balances-section';
import { GroupDetailHeader } from './-components/group-detail-header';
import { formatMoney, sumByCurrency } from './-components/group-detail.utils';
import { GroupExpensesTimeline } from './-components/group-expenses-timeline';
import { GroupParticipantsStrip } from './-components/group-participants-strip';
import type { ExpenseItem } from './-types/group-detail.types';

export const Route = createFileRoute('/_authed/groups/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const balanceRef = useRef<HTMLElement | null>(null);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showExpenseOptionsDrawer, setShowExpenseOptionsDrawer] =
    useState(false);
  const [showDeleteExpenseDrawer, setShowDeleteExpenseDrawer] = useState(false);
  const [expenseForOptions, setExpenseForOptions] =
    useState<ExpenseItem | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(
    null,
  );
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
          <a
            href="/groups"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Volver a grupos
          </a>
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
  const creditEntries = Object.entries(
    sumByCurrency(group.directCredits),
  ).filter(([, amount]) => amount > 0);
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
      ? `https://join.vornway.com/${group.inviteCode}`
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

  const handleEditExpense = (expense: ExpenseItem) => {
    void navigate({
      to: '/groups/$id/add-expense',
      params: { id },
      search: { expenseId: expense.id },
    });
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
        <GroupDetailHeader
          groupId={id}
          groupName={group.name}
          description={group.description}
          participantCount={group.participantCount}
          totalsEntries={totalsEntries}
          primaryTotal={primaryTotal}
          balanceLabel={balanceLabel}
          balanceTone={balanceTone}
          onOpenMore={() => setShowMoreDrawer(true)}
          onScrollToBalances={handleScrollToBalances}
        />

        <div className="flex-1 rounded-t-[32px] bg-white px-4 pb-8 pt-6 shadow-[0_-16px_40px_rgba(0,0,0,0.12)]">
          <GroupParticipantsStrip
            groupId={id}
            members={group.members}
            participantCount={group.participantCount}
          />

          <GroupExpensesTimeline
            expenses={expenses}
            isLoading={expensesQuery.isLoading}
            isError={expensesQuery.isError}
            error={expensesQuery.error}
            isFetchingNextPage={expensesQuery.isFetchingNextPage}
            pinnedExpenseIds={pinnedExpenseIds}
            loadMoreRef={loadMoreRef}
            onOpenExpense={handleOpenExpense}
            onOpenOptions={handleOpenExpenseOptions}
            onDeleteExpense={handleDeleteExpense}
          />

          <GroupBalancesSection group={group} balanceRef={balanceRef} />
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

            <a
              href={`/groups/${id}/participants`}
              onClick={() => setShowMoreDrawer(false)}
              className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
            >
              <UserPlus className="size-5 text-primary" />
              <span className="font-medium text-[#132238]">Participantes</span>
            </a>

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
                  <span className="font-medium text-[#132238]">Abrir</span>
                </button>

                {!expenseForOptions.isDeleted ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpenseOptionsDrawer(false);
                      setExpenseForOptions(null);
                      handleEditExpense(expenseForOptions);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-4 text-left"
                  >
                    <Pencil className="size-5 text-primary" />
                    <span className="font-medium text-[#132238]">
                      {expenseForOptions.isSettlement
                        ? 'Editar liquidación'
                        : 'Editar gasto'}
                    </span>
                  </button>
                ) : null}

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
                  por{' '}
                  <strong>
                    {formatMoney(
                      expenseToDelete.currency,
                      expenseToDelete.amount,
                    )}
                  </strong>
                  .
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
