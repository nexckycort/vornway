import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { Plus, ReceiptText, Search, UsersRound } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar';
import { Button } from '#/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '#/components/ui/input-group';
import { Skeleton } from '#/components/ui/skeleton';
import { useAuth } from '#/contexts/auth/use-auth';
import { formatCurrency } from '#/lib/i18n';
import { cn } from '#/lib/utils';
import { getFriendsExpensesMessages } from './-friends-messages';
import { useExpenseEntryData } from './-hooks/use-expense-entry-data';
import {
  type QuickSplitExpenseListItem,
  useQuickSplitExpensesInfiniteQuery,
} from './-hooks/use-quick-split-expenses-infinite-query';

export const Route = createFileRoute('/_authed/expenses/friends')({
  component: RouteComponent,
});

type ExpenseFilter = 'all' | 'settled' | 'owed' | 'owe';

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  if (pathname !== '/expenses/friends') {
    return <Outlet />;
  }

  return <FriendsExpensesPage />;
}

function FriendsExpensesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const t = getFriendsExpensesMessages();
  const { recentFriends, isLoading: friendsLoading } = useExpenseEntryData();
  const expensesQuery = useQuickSplitExpensesInfiniteQuery();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());

  const expenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [expensesQuery.data],
  );

  const visibleFriends = useMemo(
    () =>
      recentFriends.filter((friend) =>
        deferredSearch
          ? friend.name.toLocaleLowerCase().includes(deferredSearch)
          : true,
      ),
    [deferredSearch, recentFriends],
  );

  const visibleExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesSearch = deferredSearch
          ? [
              expense.description,
              expense.quickSplitName,
              expense.paidBy.name,
              ...expense.participants.map((participant) => participant.name),
            ].some((value) =>
              value.toLocaleLowerCase().includes(deferredSearch),
            )
          : true;
        const matchesFilter =
          filter === 'all' ||
          (filter === 'settled' && expense.currentUserBalance === 0) ||
          (filter === 'owed' && expense.currentUserBalance > 0) ||
          (filter === 'owe' && expense.currentUserBalance < 0);

        return matchesSearch && matchesFilter;
      }),
    [deferredSearch, expenses, filter],
  );

  const { fetchNextPage, hasNextPage, isFetching } = expensesQuery;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || !hasNextPage || isFetching) return;
        void fetchNextPage();
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetching]);

  return (
    <main className="min-h-dvh bg-[#fafafa] text-[#1e1e1e]">
      <div className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6">
        <header>
          <h1 className="text-2xl font-semibold leading-8">{t.title}</h1>
          <Button
            type="button"
            onClick={() => void navigate({ to: '/expenses/new' })}
            className="mt-4 h-11 w-full rounded-full text-base font-medium shadow-none"
          >
            <Plus className="size-4" />
            {t.newExpense}
          </Button>
        </header>

        <section className="mt-8" aria-label={t.search}>
          <InputGroup className="h-10 border-[#d9d9d9] bg-white shadow-none">
            <InputGroupAddon className="pl-4 pr-2">
              <Search className="size-4 text-[#797979]" />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="h-10 px-0 pr-4 text-sm placeholder:text-[#797979]"
            />
          </InputGroup>

          <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(Object.keys(t.filters) as ExpenseFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={cn(
                  'h-8 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors',
                  filter === value
                    ? 'border-primary bg-primary text-white'
                    : 'border-[#d9d9d9] bg-white text-[#4c4c4c]',
                )}
              >
                {t.filters[value]}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold leading-5">{t.friends}</h2>
          <div className="-mx-4 mt-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => void navigate({ to: '/expenses/new' })}
              className="flex w-12 shrink-0 flex-col items-center gap-2"
            >
              <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-primary bg-[#fff0f5] text-primary">
                <Plus className="size-4" />
              </span>
              <span className="w-14 truncate text-center text-xs text-[#4c4c4c]">
                {t.add}
              </span>
            </button>

            {friendsLoading ? (
              <FriendsSkeleton />
            ) : (
              visibleFriends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: '/expenses/quick-split',
                      search: { friendIds: [friend.id] },
                    })
                  }
                  className="flex w-12 shrink-0 flex-col items-center gap-2"
                >
                  <Avatar className="size-10">
                    {friend.image ? (
                      <AvatarImage src={friend.image} alt={friend.name} />
                    ) : null}
                    <AvatarFallback className="bg-[#e7e7e7] font-medium text-[#4c4c4c]">
                      {toInitials(friend.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="w-14 truncate text-center text-xs text-[#4c4c4c]">
                    {friend.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold leading-5">{t.expenses}</h2>

          <div className="mt-4 space-y-4">
            {expensesQuery.isLoading ? (
              <>
                <ExpenseCardSkeleton />
                <ExpenseCardSkeleton />
                <ExpenseCardSkeleton />
              </>
            ) : expensesQuery.isError ? (
              <EmptyState message={t.loadError} />
            ) : visibleExpenses.length === 0 ? (
              <EmptyState
                message={expenses.length === 0 ? t.empty : t.noResults}
              />
            ) : (
              visibleExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  currentUserId={user?.id ?? null}
                  t={t}
                />
              ))
            )}
          </div>

          <div ref={loadMoreRef} className="h-8" />

          {expensesQuery.isFetchingNextPage ? (
            <div className="space-y-4">
              <ExpenseCardSkeleton />
              <ExpenseCardSkeleton />
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ExpenseCard({
  expense,
  currentUserId,
  t,
}: {
  expense: QuickSplitExpenseListItem;
  currentUserId: string | null;
  t: ReturnType<typeof getFriendsExpensesMessages>;
}) {
  const balance = expense.currentUserBalance;
  const payerName =
    expense.paidBy.userId === currentUserId ? t.you : expense.paidBy.name;

  return (
    <Link
      to="/expenses/friends/$quickSplitId/$expenseId"
      params={{
        quickSplitId: expense.quickSplitId,
        expenseId: expense.id,
      }}
      className="flex min-h-[66px] items-center gap-3 rounded-2xl border border-[#ebebeb] bg-white p-3 shadow-[0_1px_1px_rgba(0,0,0,0.05)] transition-transform active:translate-y-px"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[#4c4c4c]">
        <ReceiptText className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-base font-semibold leading-5">
            {expense.description}
          </p>
          <div className="flex shrink-0 -space-x-1">
            {expense.participants.slice(0, 3).map((participant) => (
              <span
                key={participant.id}
                title={participant.name}
                className="flex size-4 items-center justify-center rounded-full border border-white bg-[#f4b7ca] text-[8px] font-semibold text-[#7a1737]"
              >
                {toInitials(participant.name).slice(0, 1)}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-1 truncate text-xs leading-4 text-[#797979]">
          {t.paidBy} {payerName}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-base font-medium leading-5">
          {formatCurrency(expense.currency, expense.amount)}
        </p>
        <p
          className={cn(
            'mt-1 text-xs leading-4',
            balance > 0
              ? 'text-[#16803c]'
              : balance < 0
                ? 'text-[#d92d20]'
                : 'text-[#797979]',
          )}
        >
          {balance > 0
            ? `${t.owed} ${formatCurrency(expense.currency, balance)}`
            : balance < 0
              ? `${t.owe} ${formatCurrency(expense.currency, Math.abs(balance))}`
              : t.settled}
        </p>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9d9d9] bg-white px-4 py-8 text-center">
      <UsersRound className="mx-auto size-6 text-[#a3a3a3]" />
      <p className="mt-2 text-sm text-[#626262]">{message}</p>
    </div>
  );
}

function FriendsSkeleton() {
  return Array.from({ length: 5 }, (_, index) => (
    <div key={index} className="flex w-12 shrink-0 flex-col items-center gap-2">
      <Skeleton className="size-10 rounded-full" />
      <Skeleton className="h-3 w-11" />
    </div>
  ));
}

function ExpenseCardSkeleton() {
  return (
    <div className="flex h-[66px] items-center gap-3 rounded-2xl border border-[#ebebeb] bg-white p-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="space-y-2">
        <Skeleton className="ml-auto h-4 w-20" />
        <Skeleton className="ml-auto h-3 w-24" />
      </div>
    </div>
  );
}

function toInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
