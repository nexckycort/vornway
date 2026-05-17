import {
  useGroupExpensesInfiniteQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { usePinnedExpenseIds } from '#/lib/expense-pins';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

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
  const pinnedExpenseIds = usePinnedExpenseIds(id);

  const expense = useMemo(() => {
    const items = expensesQuery.data?.pages.flatMap((page) => page.data) ?? [];
    return items.find((item) => item.id === expenseId) ?? null;
  }, [expenseId, expensesQuery.data]);

  const isPinned = expense ? pinnedExpenseIds.includes(expense.id) : false;

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-10 pt-8">
        <header className="mb-5">
          <button
            type="button"
            onClick={() =>
              navigate({ to: '/groups/$id', params: { id }, replace: true })
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </button>
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

        {expense ? (
          <section className="mt-4">
            <div className="rounded-[28px] border border-[#e2e8f0] bg-white p-5 shadow-sm">
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
                {isPinned ? (
                  <Row label="Fijado" value="Solo en este dispositivo" />
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>
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
