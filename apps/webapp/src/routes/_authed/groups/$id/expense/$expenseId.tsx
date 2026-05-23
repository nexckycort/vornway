import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  HandCoins,
  Pencil,
  ReceiptText,
  Tag,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { type ComponentType, useMemo } from 'react';
import { usePinnedExpenseIds } from '#/lib/expense-pins';
import {
  useGroupExpenseQuery,
  useGroupExpensesInfiniteQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { getExpenseEmoji } from '../-components/group-detail.utils';
import type { ExpenseItem } from '../-types/group-detail.types';

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

function normalizeExpense(
  candidate: unknown,
  fallback: ExpenseItem | null,
): ExpenseItem | null {
  if (!candidate || typeof candidate !== 'object') return fallback;

  const expense = candidate as Partial<ExpenseItem> & {
    participants?: Array<unknown>;
  };

  if (
    !expense.id ||
    !expense.description ||
    typeof expense.amount !== 'number' ||
    !expense.currency ||
    !expense.date ||
    !expense.paidBy
  ) {
    return fallback;
  }

  return {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    date: expense.date,
    isDeleted: expense.isDeleted ?? fallback?.isDeleted ?? false,
    isSettlement: expense.isSettlement ?? fallback?.isSettlement ?? false,
    isPersonal: expense.isPersonal ?? fallback?.isPersonal ?? false,
    expenseType: expense.expenseType ?? fallback?.expenseType ?? 'standard',
    subExpenseCount: expense.subExpenseCount ?? fallback?.subExpenseCount ?? 0,
    settlementToName:
      expense.settlementToName ?? fallback?.settlementToName ?? null,
    paidBy: expense.paidBy,
    participantCount:
      expense.participantCount ??
      expense.participants?.length ??
      fallback?.participantCount ??
      0,
    category: expense.category ?? fallback?.category ?? null,
    currentUserBalance:
      expense.currentUserBalance ?? fallback?.currentUserBalance ?? null,
    syncStatus: fallback?.syncStatus,
  };
}

function RouteComponent() {
  const { id, expenseId } = Route.useParams();
  const navigate = useNavigate();
  const groupSummaryQuery = useGroupSummaryQuery(id);
  const expenseQuery = useGroupExpenseQuery(id, expenseId);
  const expensesQuery = useGroupExpensesInfiniteQuery(id);
  const pinnedExpenseIds = usePinnedExpenseIds(id);

  const fallbackExpense = useMemo(() => {
    const items = expensesQuery.data?.pages.flatMap((page) => page.data) ?? [];
    return items.find((item) => item.id === expenseId) ?? null;
  }, [expenseId, expensesQuery.data]);
  const expense = useMemo(
    () => normalizeExpense(expenseQuery.data, fallbackExpense),
    [expenseQuery.data, fallbackExpense],
  );

  const isPinned = expense ? pinnedExpenseIds.includes(expense.id) : false;
  const isSettlement = expense?.isSettlement ?? false;

  const handleBack = () => {
    void navigate({ to: '/groups/$id', params: { id }, replace: true });
  };

  const handleEditExpense = () => {
    if (!expense || isSettlement) return;

    void navigate({
      to: '/groups/$id/add-expense',
      params: { id },
      search: { expenseId: expense.id },
    });
  };

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-8 pt-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            aria-label="Atrás"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-base font-semibold text-[#0f172a]">
              {isSettlement ? 'Liquidación' : 'Detalle del gasto'}
            </h1>
            <p className="truncate text-xs text-[#64748b]">
              {groupSummaryQuery.data?.name ?? 'Grupo'}
            </p>
          </div>
          {!isSettlement && expense ? (
            <button
              type="button"
              onClick={handleEditExpense}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[#334155] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
              aria-label="Editar gasto"
            >
              <Pencil className="size-4" />
            </button>
          ) : (
            <span className="size-9 shrink-0" />
          )}
        </header>

        {expenseQuery.isLoading && !fallbackExpense ? (
          <ExpenseDetailSkeleton />
        ) : null}

        {!expenseQuery.isLoading && !fallbackExpense && !expense ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No encontramos este gasto en la página cargada. Vuelve al listado y
            ábrelo desde allí.
          </div>
        ) : null}

        {expense ? (
          <section className="flex flex-1 flex-col">
            <div
              className={`relative overflow-hidden rounded-[32px] border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)] ${
                isSettlement
                  ? 'border-emerald-100 bg-emerald-50'
                  : 'border-white bg-white'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <div
                  className={`mb-4 flex size-16 items-center justify-center rounded-[26px] ${
                    isSettlement
                      ? 'bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.22)]'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {isSettlement ? (
                    <HandCoins className="size-7" />
                  ) : (
                    <span className="text-3xl">{getExpenseEmoji(expense)}</span>
                  )}
                </div>

                <p className="max-w-full truncate text-sm font-medium text-[#64748b]">
                  {formatDate(expense.date)}
                </p>
                <h2 className="mt-1 max-w-full truncate text-2xl font-semibold tracking-tight text-[#0f172a]">
                  {expense.description}
                </h2>
                <p
                  className={`shrink-0 text-3xl font-bold ${
                    isSettlement ? 'text-emerald-700' : 'text-primary'
                  }`}
                >
                  {formatAmount(expense.currency, expense.amount)}
                </p>
                {isSettlement ? (
                  <div className="mt-3 flex max-w-full items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <span className="truncate">{expense.paidBy.name}</span>
                    <ArrowRight className="size-4 shrink-0" />
                    <span className="truncate">
                      {expense.settlementToName ?? 'otro miembro'}
                    </span>
                  </div>
                ) : null}
              </div>

              {!isSettlement ? (
                <button
                  type="button"
                  onClick={handleEditExpense}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-white shadow-[0_10px_24px_rgba(222,3,77,0.18)]"
                >
                  <Pencil className="size-4" />
                  Editar gasto
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-[28px] border border-[#e2e8f0] bg-white px-4 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <DetailRow
                icon={UserRound}
                label={isSettlement ? 'Pagó' : 'Pagado por'}
                value={expense.paidBy.name}
              />
              {isSettlement ? (
                <DetailRow
                  icon={ArrowRight}
                  label="Recibió"
                  value={expense.settlementToName ?? 'otro miembro'}
                />
              ) : (
                <>
                  <DetailRow
                    icon={UsersRound}
                    label="Participantes"
                    value={`${expense.participantCount} persona${expense.participantCount === 1 ? '' : 's'}`}
                  />
                  <DetailRow
                    icon={Tag}
                    label="Categoría"
                    value={expense.category?.name ?? 'Sin categoría'}
                  />
                  <DetailRow
                    icon={ReceiptText}
                    label="Tipo"
                    value={
                      expense.expenseType === 'composite'
                        ? 'Gasto compuesto'
                        : 'Gasto simple'
                    }
                  />
                </>
              )}
              <DetailRow
                icon={CheckCircle2}
                label="Estado"
                value={expense.isDeleted ? 'Eliminado' : 'Activo'}
              />
              <DetailRow
                icon={CalendarDays}
                label="Fecha"
                value={formatDate(expense.date)}
              />
              {isSettlement ? (
                <DetailRow
                  icon={HandCoins}
                  label="Tipo"
                  value="Liquidación de saldo"
                />
              ) : null}
              {isPinned ? (
                <DetailRow
                  icon={ReceiptText}
                  label="Fijado"
                  value="Solo en este dispositivo"
                />
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#f1f5f9] py-3 last:border-b-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f8fafc] text-[#64748b]">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm text-[#64748b]">{label}</span>
      <span className="max-w-[52%] truncate text-right text-sm font-semibold text-[#0f172a]">
        {value}
      </span>
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
