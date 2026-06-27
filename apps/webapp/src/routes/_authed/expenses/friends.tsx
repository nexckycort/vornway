import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { Plus, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { Button } from '#/components/ui/button';
import { RecentExpenseCard } from '#/routes/_authed/(home)/-components/recent-expense-card';
import { getHomeMessages } from '#/routes/_authed/(home)/-messages';
import { useQuickSplitExpensesInfiniteQuery } from './-hooks/use-quick-split-expenses-infinite-query';

export const Route = createFileRoute('/_authed/expenses/friends')({
  component: RouteComponent,
});

function RouteComponent() {
  const t = getHomeMessages();
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const expensesQuery = useQuickSplitExpensesInfiniteQuery();

  if (pathname !== '/expenses/friends') {
    return <Outlet />;
  }

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

  return (
    <main className="min-h-screen bg-[#efefef] text-foreground">
      <div className="flex min-h-screen w-full flex-col bg-[#fafafa] px-4 pb-28 pt-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold leading-9 text-[#0f172a]">
              {t.recentExpenses}
            </h1>
            <p className="mt-2 text-sm text-[#64748b]">
              {t.noRecentExpensesCopy}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => void navigate({ to: '/expenses/new' })}
            className="shrink-0 rounded-full px-4"
          >
            <Plus className="size-4" />
            {t.createExpense}
          </Button>
        </header>

        <section className="mt-6">
          {expensesQuery.isLoading ? (
            <div className="space-y-4">
              <ExpenseCardSkeleton />
              <ExpenseCardSkeleton />
              <ExpenseCardSkeleton />
            </div>
          ) : expensesQuery.isError ? (
            <div className="rounded-[28px] border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {t.loadError}
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-[28px] border border-[#e2e8f0] bg-white px-5 py-8 text-center shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#fff1f5] text-primary">
                <UsersRound className="size-7" />
              </div>
              <p className="text-base font-semibold text-[#0f172a]">
                {t.noRecentExpensesTitle}
              </p>
              <p className="mt-2 text-sm text-[#64748b]">
                {t.noRecentExpensesCopy}
              </p>
              <button
                type="button"
                onClick={() => void navigate({ to: '/expenses/new' })}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-white"
              >
                {t.createExpense}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((item) => (
                <RecentExpenseCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <div ref={loadMoreRef} className="h-10" />

          {expensesQuery.isFetchingNextPage ? (
            <div className="mt-4 space-y-4">
              <ExpenseCardSkeleton />
              <ExpenseCardSkeleton />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ExpenseCardSkeleton() {
  return (
    <div className="h-[88px] rounded-[24px] bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]" />
  );
}
