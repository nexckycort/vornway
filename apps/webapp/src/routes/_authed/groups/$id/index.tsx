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
import { useRemoveMemberMutation } from '#/routes/_authed/groups/-hooks/use-group-actions';
import {
  useGroupExpensesInfiniteQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { useToggleExpensePinMutation } from '#/routes/_authed/groups/-hooks/use-toggle-expense-pin';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Pencil, Share2, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GroupDetailHeader } from './-components/group-detail-header';
import { formatMoney, sumByCurrency } from './-components/group-detail.utils';
import { GroupExpensesTimeline } from './-components/group-expenses-timeline';
import { GroupParticipantsStrip } from './-components/group-participants-strip';
import { GroupDetailSkeleton } from './-components/group-detail-skeleton';
import type { ExpenseItem, GroupSummary } from './-types/group-detail.types';

export const Route = createFileRoute('/_authed/groups/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [showQrDrawer, setShowQrDrawer] = useState(false);
  const [showExpenseOptionsDrawer, setShowExpenseOptionsDrawer] =
    useState(false);
  const [showDeleteExpenseDrawer, setShowDeleteExpenseDrawer] = useState(false);
  const [showRemoveMemberDrawer, setShowRemoveMemberDrawer] = useState(false);
  const [expenseForOptions, setExpenseForOptions] =
    useState<ExpenseItem | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(
    null,
  );
  const [memberToRemove, setMemberToRemove] = useState<
    GroupSummary['members'][number] | null
  >(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [groupQrCode, setGroupQrCode] = useState<string | null>(null);

  const groupQuery = useGroupSummaryQuery(id);
  const expensesQuery = useGroupExpensesInfiniteQuery(id);
  const deleteExpenseMutation = useDeleteExpenseMutation(id);
  const removeMemberMutation = useRemoveMemberMutation(id);
  const toggleExpensePinMutation = useToggleExpensePinMutation();
  const pinnedExpenseIds = usePinnedExpenseIds(id);

  const expenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [expensesQuery.data],
  );
  const inviteLink =
    groupQuery.data?.inviteCode && typeof window !== 'undefined'
      ? `https://join.vornway.com/${groupQuery.data.inviteCode}`
      : '';
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

  useEffect(() => {
    let active = true;

    if (!inviteLink) {
      setGroupQrCode(null);
      return;
    }

    void QRCode.toDataURL(inviteLink, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: '#111111',
        light: '#ffffff',
      },
    })
      .then((dataUrl: string) => {
        if (active) {
          setGroupQrCode(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setGroupQrCode(null);
        }
      });

    return () => {
      active = false;
    };
  }, [inviteLink]);

  if (groupQuery.isLoading) {
    return <GroupDetailSkeleton />;
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

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await removeMemberMutation.mutateAsync({
        memberId: memberToRemove.id,
      });
      setShowRemoveMemberDrawer(false);
      setMemberToRemove(null);
    } catch (error) {
      setShareMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el miembro',
      );
    }
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
    <main className="min-h-screen bg-[#111111] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#111111]">
        <GroupDetailHeader
          groupId={id}
          groupName={group.name}
          description={group.description}
          totalsEntries={totalsEntries}
          primaryTotal={primaryTotal}
          balanceLabel={balanceLabel}
          balanceTone={balanceTone}
          onOpenQr={() => setShowQrDrawer(true)}
          onOpenMore={() => setShowMoreDrawer(true)}
          onOpenReports={() =>
            void navigate({ to: '/groups/$id/reports', params: { id } })
          }
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
        </div>
      </div>

      <Drawer open={showQrDrawer} onOpenChange={setShowQrDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Código QR del grupo</DrawerTitle>
            <DrawerDescription>{group.name}</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-3 px-5 pb-5">
            <p className="text-sm text-[#64748b]">
              Escanea este código desde otro celular para abrir la invitación
              del grupo.
            </p>

            {groupQrCode ? (
              <div className="flex justify-center rounded-[28px] border border-[#e2e8f0] bg-white p-4">
                <img
                  src={groupQrCode}
                  alt={`Código QR para unirse a ${group.name}`}
                  className="size-64 rounded-[24px] bg-white object-contain"
                />
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-10 text-center text-sm text-[#64748b]">
                Generando QR...
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full"
              onClick={shareInvite}
            >
              Compartir enlace
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

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

      <Drawer
        open={showRemoveMemberDrawer && Boolean(memberToRemove)}
        onOpenChange={(open) => {
          if (!open) {
            setShowRemoveMemberDrawer(false);
            setMemberToRemove(null);
          } else {
            setShowRemoveMemberDrawer(true);
          }
        }}
      >
        <DrawerContent>
          {memberToRemove ? (
            <>
              <DrawerHeader>
                <DrawerTitle>Eliminar miembro</DrawerTitle>
                <DrawerDescription>
                  Solo puedes eliminarlo si no tiene saldos pendientes.
                </DrawerDescription>
              </DrawerHeader>

              <div className="px-5 pb-2">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Vas a eliminar a <strong>{memberToRemove.name}</strong> del
                  grupo.
                </div>
              </div>

              <DrawerFooter>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 rounded-full"
                  onClick={handleConfirmRemoveMember}
                  disabled={removeMemberMutation.isPending}
                >
                  {removeMemberMutation.isPending
                    ? 'Eliminando...'
                    : 'Sí, eliminar miembro'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full"
                  onClick={() => {
                    setShowRemoveMemberDrawer(false);
                    setMemberToRemove(null);
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
