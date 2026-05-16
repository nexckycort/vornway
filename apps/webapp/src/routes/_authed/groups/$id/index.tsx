import { Button } from '#/components/ui/button';
import {
  useGroupExpensesInfiniteQuery,
  useGroupSummaryQuery,
} from '#/routes/_authed/groups/-hooks/use-group-detail-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

export const Route = createFileRoute('/_authed/groups/$id/')({
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
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function RouteComponent() {
  const { id } = Route.useParams();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const groupSummaryQuery = useGroupSummaryQuery(id);
  const expensesQuery = useGroupExpensesInfiniteQuery(id);

  const expenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [expensesQuery.data],
  );
  const totalExpenses = expensesQuery.data?.pages[0]?.pagination.total ?? 0;

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

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[412px] flex-col bg-[#fafafa] px-4 pb-10 pt-8">
        <header className="mb-5">
          <Link
            to="/groups"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#334155]"
          >
            <ArrowLeft className="size-4" />
            Atrás
          </Link>

          {groupSummaryQuery.isLoading ? (
            <p className="text-sm text-[#64748b]">Cargando grupo...</p>
          ) : groupSummaryQuery.isError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(groupSummaryQuery.error as Error).message}
            </p>
          ) : groupSummaryQuery.data ? (
            <>
              <h1 className="text-2xl font-semibold leading-8 text-[#0f172a]">
                {groupSummaryQuery.data.name}
              </h1>
              <p className="mt-1 text-sm text-[#64748b]">
                {groupSummaryQuery.data.participantCount} participantes
              </p>
            </>
          ) : null}
        </header>

        <section className="mb-4 rounded-2xl border border-[#e2e8f0] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#0f172a]">Gastos</h2>
          <p className="mt-1 text-xs text-[#64748b]">
            {expensesQuery.isLoading
              ? 'Cargando gastos...'
              : `${totalExpenses} gastos en total`}
          </p>
        </section>

        {expensesQuery.isError ? (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {(expensesQuery.error as Error).message}
          </div>
        ) : null}

        {!expensesQuery.isLoading && expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white px-5 py-8 text-center text-sm text-[#64748b]">
            Aún no hay gastos en este grupo.
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          {expenses.map((expense) => (
            <Link
              key={expense.id}
              to="/groups/$id/expense/$expenseId"
              params={{ id, expenseId: expense.id }}
              className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[#0f172a]">
                    {expense.description}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[#64748b]">
                    {expense.expenseType}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[#0f172a]">
                  {formatAmount(expense.currency, expense.amount)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-[#64748b]">
                <span>{formatDate(expense.date)}</span>
                <span>{expense.paidBy.name}</span>
              </div>
            </Link>
          ))}
        </section>

        <div ref={loadMoreRef} className="h-8" />

        {expensesQuery.isFetchingNextPage ? (
          <p className="text-center text-sm text-[#64748b]">Cargando más...</p>
        ) : null}

        {!expensesQuery.hasNextPage && expenses.length > 0 ? (
          <p className="text-center text-sm text-[#94a3b8]">
            No hay más gastos por cargar.
          </p>
        ) : null}

        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onClick={() => void expensesQuery.refetch()}
            disabled={expensesQuery.isFetching}
          >
            Actualizar gastos
          </Button>
        </div>
      </div>
    </main>
  );
}
