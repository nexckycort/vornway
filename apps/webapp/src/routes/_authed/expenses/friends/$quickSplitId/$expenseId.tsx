import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, PencilLine, Trash2, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '#/components/ui/drawer';
import { useAuth } from '#/contexts/auth/use-auth';
import { formatCurrency } from '#/lib/i18n';
import { useDeleteQuickSplitExpenseMutation } from '#/routes/_authed/expenses/-hooks/use-delete-quick-split-expense';
import { useQuickSplitExpenseQuery } from '#/routes/_authed/expenses/-hooks/use-quick-split-expense-query';

export const Route = createFileRoute(
  '/_authed/expenses/friends/$quickSplitId/$expenseId',
)({
  component: RouteComponent,
});

const expenseDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatAmount(currency: string, amount: number): string {
  try {
    return formatCurrency(currency, amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return expenseDateFormatter.format(date);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function RouteComponent() {
  const { quickSplitId, expenseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const expenseQuery = useQuickSplitExpenseQuery(quickSplitId, expenseId);
  const deleteExpenseMutation = useDeleteQuickSplitExpenseMutation();
  const [showDeleteDrawer, setShowDeleteDrawer] = useState(false);

  const fallbackExpense = useMemo(() => {
    const cachedExpenses = queryClient.getQueryData<{
      pages?: Array<{
        data?: Array<{
          id: string;
          quickSplitId: string;
          quickSplitName: string;
          description: string;
          amount: number;
          currency: string;
          participantCount: number;
          paidBy: {
            id: string;
            name: string;
          };
          createdAt: string;
        }>;
      }>;
    }>(['quick-split-expenses']);
    const items =
      cachedExpenses?.pages?.flatMap((page) => page.data ?? []) ?? [];
    return (
      items.find(
        (item) => item.id === expenseId && item.quickSplitId === quickSplitId,
      ) ?? null
    );
  }, [expenseId, quickSplitId, queryClient]);

  const expense = expenseQuery.data;
  const handleBack = () => {
    void navigate({ to: '/expenses/friends' });
  };
  const handleConfirmDelete = async () => {
    try {
      await deleteExpenseMutation.mutateAsync({
        quickSplitId,
        expenseId,
      });
      setShowDeleteDrawer(false);
      toast.success('Gasto eliminado');
      await navigate({ to: '/expenses/friends' });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar el gasto con amigos',
      );
    }
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] md:max-w-5xl flex-col overflow-x-hidden bg-[#ececec] px-4 pb-8 pt-6">
        <header className="mb-5 grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label="Atrás"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-semibold text-[#0f172a]">
              Detalle
            </h1>
          </div>
          <span className="size-9" />
        </header>

        {expenseQuery.isLoading && !fallbackExpense ? (
          <ExpenseDetailSkeleton />
        ) : null}

        {!expenseQuery.isLoading && !expense ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No encontramos este gasto. Vuelve al listado y ábrelo desde allí.
          </div>
        ) : null}

        {expense ? (
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
              <div className="px-5 pb-4 pt-4 text-center">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[#fff1f5] text-primary">
                  <UsersRound className="size-6" />
                </div>
                <h2 className="truncate text-base font-medium text-[#444444]">
                  {expense.description}
                </h2>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-[#202124]">
                  {formatAmount(expense.currency, expense.amount)}
                </p>
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex items-center rounded-full bg-[#fff1f5] px-3 py-1 text-[11px] font-semibold leading-none text-primary">
                    {expense.quickSplitName}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[#202124]">
                  <span>{formatDate(expense.createdAt)}</span>
                  <span className="mx-1 text-[#9ca3af]">•</span>
                  <span className="font-semibold">{expense.paidBy.name}</span>
                </p>
              </div>

              <div className="relative border-t border-dashed border-[#e2e8f0] px-5 pb-6 pt-5 before:absolute before:-left-3 before:-top-3 before:size-6 before:rounded-full before:bg-[#ececec] after:absolute after:-right-3 after:-top-3 after:size-6 after:rounded-full after:bg-[#ececec]">
                <p className="mb-4 text-xs font-medium text-[#444444]">
                  Pagado por
                </p>
                <div className="space-y-4">
                  <MemberLine
                    image={expense.paidBy.image}
                    name={`${expense.paidBy.name}${expense.paidBy.id === user?.id ? ' (Tu)' : ''}`}
                    amount={formatAmount(expense.currency, expense.amount)}
                  />
                </div>

                <p className="mb-4 mt-7 text-xs font-medium text-[#444444]">
                  Se divide con
                </p>
                <div className="space-y-5">
                  {expense.participants.map((participant) => (
                    <MemberLine
                      key={participant.userId}
                      image={participant.image}
                      name={`${participant.name}${participant.userId === user?.id ? ' (Tu)' : ''}`}
                      amount={formatAmount(expense.currency, participant.share)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-auto flex items-center gap-3 px-5 pb-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteDrawer(true)}
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#202124] shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
                  aria-label="Eliminar gasto"
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: '/expenses/quick-split',
                      search: {
                        friendIds: [],
                        quickSplitId,
                        expenseId,
                      },
                    })
                  }
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#080202] text-sm font-semibold text-white"
                >
                  <PencilLine className="size-4" />
                  Editar gasto
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <Drawer open={showDeleteDrawer} onOpenChange={setShowDeleteDrawer}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Eliminar gasto</DrawerTitle>
            <DrawerDescription>
              Esta acción eliminará el gasto con amigos.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="grid grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full"
              onClick={() => setShowDeleteDrawer(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-11 rounded-full"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </main>
  );
}

function MemberLine({
  image,
  name,
  amount,
}: {
  image: string | null;
  name: string;
  amount?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {image ? (
        <img
          src={image}
          alt={name}
          className="size-9 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span className="flex size-9 items-center justify-center rounded-full bg-[#eeeeee] text-sm font-medium text-[#555555]">
          {getInitials(name)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[#202124]">
          {name}
        </span>
      </div>
      {amount ? (
        <span className="shrink-0 text-sm font-semibold text-[#202124]">
          {amount}
        </span>
      ) : null}
    </div>
  );
}

function ExpenseDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-[32px] border border-white bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
        <div className="mx-auto mb-4 size-16 rounded-[26px] bg-[#e5e7eb]" />
        <div className="mx-auto h-4 w-28 rounded-full bg-[#e5e7eb]" />
        <div className="mx-auto mt-3 h-7 w-44 rounded-full bg-[#e5e7eb]" />
        <div className="mx-auto mt-3 h-9 w-36 rounded-full bg-[#e5e7eb]" />
      </div>
      <div className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white px-4 py-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-[#f1f5f9] py-3 last:border-b-0"
          >
            <div className="size-9 rounded-full bg-[#f1f5f9]" />
            <div className="h-4 flex-1 rounded-full bg-[#f1f5f9]" />
            <div className="h-4 w-20 rounded-full bg-[#f1f5f9]" />
          </div>
        ))}
      </div>
    </div>
  );
}
