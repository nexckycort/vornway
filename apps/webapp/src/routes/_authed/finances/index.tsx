import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import type { Cursor } from '@vornway/api-client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';
import { FinanceBudgetsView } from './-components/finance-budgets-view';
import { FinanceCategoriesView } from './-components/finance-categories-view';
import { FinanceDashboardView } from './-components/finance-dashboard-view';
import {
  categorySpend,
  compareFinanceMovements,
  currency,
  currentMonthKey,
  dateKeyToLocalDate,
  type FinanceTransactionInput,
  type FinanceView,
  getBrowserTimeZone,
  getCurrencyValue,
  isFinanceView,
  parseMoney,
  parseTagsInput,
  todayKey,
} from './-components/finance-model';
import { CreateTransactionView } from './-components/finance-transaction-views';

export const Route = createFileRoute('/_authed/finances/')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: isFinanceView(search.view) ? search.view : 'dashboard',
    month:
      typeof search.month === 'string' && /^\d{4}-\d{2}$/.test(search.month)
        ? search.month
        : currentMonthKey(),
    transactionId:
      typeof search.transactionId === 'string'
        ? search.transactionId
        : undefined,
    accountId:
      typeof search.accountId === 'string' ? search.accountId : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  if (pathname !== '/finances') {
    return <Outlet />;
  }

  return <FinancesDashboard />;
}

function FinancesDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { view, month } = Route.useSearch();
  const timeZone = getBrowserTimeZone();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    'expense',
  );
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayKey);
  const [categoryId, setCategoryId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['finances-summary', month, currency, timeZone],
    queryFn: async () => {
      return failWithMessage(
        api.finances.summary.request({
          query: { month, currency, timeZone },
        }),
        m['finances.loadError'](),
      );
    },
  });
  const movementsQuery = useInfiniteQuery({
    queryKey: ['finances-movements', month, currency, timeZone],
    initialPageParam: undefined as Cursor | undefined,
    queryFn: async ({ pageParam }) => {
      return failWithMessage(
        api.finances.movements.request({
          query: {
            month,
            currency,
            timeZone,
            limit: 20,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        }),
        m['finances.loadError'](),
      );
    },
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });
  const summary = summaryQuery.data;
  const movements = useMemo(
    () =>
      (movementsQuery.data?.pages.flatMap((page) => page.data) ?? [])
        .slice()
        .sort(compareFinanceMovements),
    [movementsQuery.data],
  );
  const categories = summary?.categories ?? [];
  const tags = summary?.tags ?? [];
  const transactionAccounts =
    summary?.accounts.filter(
      (account) => account.status !== 'CLOSED' && account.currency === currency,
    ) ?? [];
  const hasNextMovementsPageRef = useRef(movementsQuery.hasNextPage);
  const isFetchingMovementsRef = useRef(movementsQuery.isFetching);
  const fetchNextMovementsPageRef = useRef(movementsQuery.fetchNextPage);

  useEffect(() => {
    hasNextMovementsPageRef.current = movementsQuery.hasNextPage;
    isFetchingMovementsRef.current = movementsQuery.isFetching;
    fetchNextMovementsPageRef.current = movementsQuery.fetchNextPage;
  }, [
    movementsQuery.hasNextPage,
    movementsQuery.isFetching,
    movementsQuery.fetchNextPage,
  ]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (
          !hasNextMovementsPageRef.current ||
          isFetchingMovementsRef.current
        ) {
          return;
        }
        void fetchNextMovementsPageRef.current();
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const transactionCategories = useMemo(
    () =>
      categories.filter((category) =>
        transactionType === 'income'
          ? category.transactionType === 'INCOME' ||
            category.transactionType === 'BOTH'
          : category.transactionType === 'EXPENSE' ||
            category.transactionType === 'BOTH',
      ),
    [categories, transactionType],
  );

  const createTransactionMutation = useMutation({
    mutationFn: async (input: FinanceTransactionInput) => {
      return failWithMessage(
        api.finances.createTransaction.request({ payload: input }),
        m['finances.saveFailed'](),
      );
    },
    onSuccess: async () => {
      await invalidateFinanceQueries();
      setDescription('');
      setAmount('');
      setCategoryId('');
      setSelectedAccountId('');
      setTagsInput('');
      setTransactionDate(todayKey());
      toast.success(m['finances.transactionSaved']());
      goTo('dashboard');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : m['finances.saveFailed'](),
      );
    },
  });

  function invalidateFinanceQueries() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
      queryClient.invalidateQueries({
        queryKey: ['finances-account-movements'],
      }),
      queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
  }

  function goTo(
    nextView: FinanceView,
    nextTransactionId?: string,
    nextAccountId?: string,
  ) {
    void navigate({
      search: {
        view: nextView,
        month,
        transactionId: nextTransactionId,
        accountId: nextAccountId,
      },
    });
  }

  function submitTransaction() {
    const parsedAmount = parseMoney(amount);
    if (!description.trim() || parsedAmount <= 0) {
      toast.error(m['finances.validation']());
      return;
    }

    createTransactionMutation.mutate({
      type: transactionType,
      description: description.trim(),
      amount: parsedAmount,
      currency,
      occurredAt: dateKeyToLocalDate(transactionDate),
      tags: parseTagsInput(tagsInput),
      ...(categoryId ? { categoryId } : {}),
      ...(selectedAccountId ? { accountId: selectedAccountId } : {}),
    });
  }

  if (summaryQuery.isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-5 pt-8 text-[#101113]">
        <div className="mx-auto max-w-[560px] rounded-[30px] bg-white p-6 text-sm text-black/50">
          {m['common.loading']()}
        </div>
      </main>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <main className="min-h-screen bg-[#f7f7f4] px-5 pt-8 text-[#101113]">
        <div className="mx-auto max-w-[560px] rounded-[30px] bg-white p-6 text-sm text-red-700">
          {m['finances.loadError']()}
        </div>
      </main>
    );
  }

  const income = getCurrencyValue(summary.totals.incomeByCurrency, currency);
  const totalExpense = getCurrencyValue(
    summary.totals.totalExpenseByCurrency,
    currency,
  );
  const balance = getCurrencyValue(summary.totals.balanceByCurrency, currency);
  const categoryTotals = Object.fromEntries(
    categories.map((category) => [
      category.id,
      categorySpend(summary, category.id),
    ]),
  );
  if (view === 'new') {
    return (
      <CreateTransactionView
        month={month}
        transactionType={transactionType}
        amount={amount}
        categoryId={categoryId}
        selectedAccountId={selectedAccountId}
        description={description}
        transactionDate={transactionDate}
        tagsInput={tagsInput}
        transactionCategories={transactionCategories}
        transactionAccounts={transactionAccounts}
        tags={tags}
        isSaving={createTransactionMutation.isPending}
        onBack={() => goTo('dashboard')}
        onTransactionTypeChange={(type) => {
          setTransactionType(type);
          setCategoryId('');
        }}
        onAmountChange={setAmount}
        onCategoryChange={setCategoryId}
        onAccountChange={setSelectedAccountId}
        onDescriptionChange={setDescription}
        onTransactionDateChange={setTransactionDate}
        onTagsInputChange={setTagsInput}
        onSubmit={submitTransaction}
      />
    );
  }

  if (view === 'categories') {
    return (
      <FinanceCategoriesView
        month={month}
        categories={categories}
        onBack={() => goTo('dashboard')}
      />
    );
  }

  if (view === 'budgets') {
    return (
      <FinanceBudgetsView
        month={month}
        summary={summary}
        categories={categories}
        onBack={() => goTo('dashboard')}
      />
    );
  }

  return (
    <FinanceDashboardView
      month={month}
      income={income}
      totalExpense={totalExpense}
      balance={balance}
      categories={categories}
      categoryTotals={categoryTotals}
      movements={movements}
      loadMoreRef={loadMoreRef}
      isMovementsLoading={movementsQuery.isPending}
      isFetchingNextMovementsPage={movementsQuery.isFetchingNextPage}
      onGoTo={goTo}
    />
  );
}
