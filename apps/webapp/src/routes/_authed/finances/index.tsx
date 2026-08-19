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
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { m } from '#/paraglide/messages.js';
import { FinanceDashboardView } from './-components/finance-dashboard-view';
import { ScreenShell, SummaryCard } from './-components/finance-layout';
import {
  categoryColors,
  categoryIcons,
  categorySpend,
  compareFinanceMovements,
  createCategoryEndpoint,
  createTransactionEndpoint,
  currency,
  currentMonthKey,
  dateKeyToLocalDate,
  deleteCategoryEndpoint,
  type FinanceBudgetInput,
  type FinanceCategory,
  type FinanceCategoryInput,
  type FinanceCategoryKind,
  type FinanceCategoryUpdateInput,
  type FinanceTransactionInput,
  type FinanceView,
  getBrowserTimeZone,
  getCategoryKindLabel,
  getCurrencyValue,
  isFinanceView,
  moneyLabel,
  movementsEndpoint,
  parseMoney,
  parseTagsInput,
  summaryEndpoint,
  toCategoryKind,
  todayKey,
  updateCategoryEndpoint,
  upsertBudgetEndpoint,
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
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] =
    useState<FinanceCategoryKind>('both');
  const [newCategoryColor, setNewCategoryColor] = useState<string>(
    categoryColors[0],
  );
  const [newCategoryIcon, setNewCategoryIcon] = useState(categoryIcons[0]);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryType, setEditingCategoryType] =
    useState<FinanceCategoryKind>('both');
  const [editingCategoryColor, setEditingCategoryColor] = useState<string>(
    categoryColors[0],
  );
  const [editingCategoryIcon, setEditingCategoryIcon] = useState(
    categoryIcons[0],
  );
  const [budgetCategoryId, setBudgetCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');

  const summaryQuery = useQuery({
    queryKey: ['finances-summary', month, currency, timeZone],
    queryFn: async () => {
      const response = await summaryEndpoint({
        query: { month, currency, timeZone },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
    },
  });
  const movementsQuery = useInfiniteQuery({
    queryKey: ['finances-movements', month, currency, timeZone],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await movementsEndpoint({
        query: {
          month,
          currency,
          timeZone,
          limit: '20',
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      if (!response.ok) throw new Error(m['finances.loadError']());
      return response.json();
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
  hasNextMovementsPageRef.current = movementsQuery.hasNextPage;
  isFetchingMovementsRef.current = movementsQuery.isFetching;
  fetchNextMovementsPageRef.current = movementsQuery.fetchNextPage;

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
      const response = await createTransactionEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.saveFailed']());
      return response.json();
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

  const budgetMutation = useMutation({
    mutationFn: async (input: FinanceBudgetInput) => {
      const response = await upsertBudgetEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.budgetSaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finances-summary'] });
      setBudgetAmount('');
      toast.success(m['finances.budgetSaved']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.budgetSaveFailed'](),
      );
    },
  });

  const categoryMutation = useMutation({
    mutationFn: async (input: FinanceCategoryInput) => {
      const response = await createCategoryEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.categorySaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
      ]);
      setNewCategoryName('');
      toast.success(m['finances.categorySaved']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.categorySaveFailed'](),
      );
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: FinanceCategoryUpdateInput;
    }) => {
      const response = await updateCategoryEndpoint({
        param: { id },
        json: input,
      });
      if (!response.ok) throw new Error(m['finances.categoryUpdateFailed']());
      return response.json();
    },
    onSuccess: async (category) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
      ]);
      selectCategoryToEdit(category);
      toast.success(m['finances.categoryUpdated']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.categoryUpdateFailed'](),
      );
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteCategoryEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.deleteCategoryFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['finances-movements'] }),
      ]);
      setEditingCategoryId('');
      setEditingCategoryName('');
      toast.success(m['finances.categoryDeleted']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.deleteCategoryFailed'](),
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

  function submitBudget() {
    const parsedAmount = parseMoney(budgetAmount);
    if (!budgetCategoryId || parsedAmount < 0) {
      toast.error(m['finances.budgetValidation']());
      return;
    }

    budgetMutation.mutate({
      categoryId: budgetCategoryId,
      month,
      amount: parsedAmount,
      currency,
    });
  }

  function submitCategory() {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error(m['finances.categoryValidation']());
      return;
    }

    categoryMutation.mutate({
      name,
      type: newCategoryType,
      color: newCategoryColor,
      icon: newCategoryIcon,
    });
  }

  function selectCategoryToEdit(category: FinanceCategory) {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
    setEditingCategoryType(toCategoryKind(category.transactionType));
    setEditingCategoryColor(category.color ?? categoryColors[0]);
    setEditingCategoryIcon(category.icon ?? categoryIcons[0]);
  }

  function submitCategoryUpdate() {
    const name = editingCategoryName.trim();
    if (!editingCategoryId || !name) {
      toast.error(m['finances.categoryValidation']());
      return;
    }

    updateCategoryMutation.mutate({
      id: editingCategoryId,
      input: {
        name,
        type: editingCategoryType,
        color: editingCategoryColor,
        icon: editingCategoryIcon,
      },
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
      <ScreenShell
        title={m['finances.categories']()}
        month={month}
        onBack={() => goTo('dashboard')}
      >
        <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.createCategory']()}
            </h2>
            <div className="mt-5 grid gap-4">
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder={m['finances.categoryPlaceholder']()}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              <div className="grid grid-cols-3 gap-2 rounded-full bg-[#f7f7f4] p-1">
                {(['both', 'expense', 'income'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewCategoryType(type)}
                    className={`h-10 rounded-full text-sm font-medium ${
                      newCategoryType === type
                        ? 'bg-[#101113] text-white'
                        : 'text-black/50'
                    }`}
                  >
                    {getCategoryKindLabel(type)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {categoryColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategoryColor(color)}
                    className={`size-9 rounded-full border-2 ${
                      newCategoryColor === color
                        ? 'border-black'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={color}
                  />
                ))}
              </div>
              <select
                value={newCategoryIcon}
                onChange={(event) => setNewCategoryIcon(event.target.value)}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              >
                {categoryIcons.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={submitCategory}
                disabled={categoryMutation.isPending}
                className="h-12 rounded-full"
              >
                {categoryMutation.isPending
                  ? m['common.saving']()
                  : m['finances.saveCategory']()}
              </Button>
            </div>
          </section>

          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.editCategory']()}
            </h2>
            <div className="mt-4 grid gap-2">
              {categories.map((category: FinanceCategory) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategoryToEdit(category)}
                  className={`flex items-center gap-3 rounded-[20px] p-3 text-left ${
                    editingCategoryId === category.id
                      ? 'bg-black text-white'
                      : 'bg-[#f7f7f4]'
                  }`}
                >
                  <span
                    className="size-4 rounded-full"
                    style={{ backgroundColor: category.color ?? '#101113' }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {category.name}
                  </span>
                  <span className="text-xs opacity-60">
                    {getCategoryKindLabel(
                      toCategoryKind(category.transactionType),
                    )}
                  </span>
                </button>
              ))}
            </div>

            {editingCategoryId ? (
              <div className="mt-5 grid gap-4 border-t border-black/5 pt-5">
                <input
                  value={editingCategoryName}
                  onChange={(event) =>
                    setEditingCategoryName(event.target.value)
                  }
                  placeholder={m['finances.categoryPlaceholder']()}
                  className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
                <div className="grid grid-cols-3 gap-2 rounded-full bg-[#f7f7f4] p-1">
                  {(['both', 'expense', 'income'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditingCategoryType(type)}
                      className={`h-10 rounded-full text-sm font-medium ${
                        editingCategoryType === type
                          ? 'bg-[#101113] text-white'
                          : 'text-black/50'
                      }`}
                    >
                      {getCategoryKindLabel(type)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingCategoryColor(color)}
                      className={`size-9 rounded-full border-2 ${
                        editingCategoryColor === color
                          ? 'border-black'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
                <select
                  value={editingCategoryIcon}
                  onChange={(event) =>
                    setEditingCategoryIcon(event.target.value)
                  }
                  className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                >
                  {categoryIcons.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Button
                    type="button"
                    onClick={submitCategoryUpdate}
                    disabled={updateCategoryMutation.isPending}
                    className="h-12 rounded-full"
                  >
                    {updateCategoryMutation.isPending
                      ? m['common.saving']()
                      : m['finances.saveCategoryChanges']()}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(m['finances.deleteCategoryConfirm']())) {
                        deleteCategoryMutation.mutate(editingCategoryId);
                      }
                    }}
                    disabled={deleteCategoryMutation.isPending}
                    className="h-12 rounded-full"
                  >
                    {m['common.delete']()}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </ScreenShell>
    );
  }

  if (view === 'budgets') {
    return (
      <ScreenShell
        title={m['finances.budgets']()}
        month={month}
        onBack={() => goTo('dashboard')}
      >
        <section className="grid gap-4">
          {summary.budgets.length === 0 ? (
            <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
              {m['finances.emptyBudgets']()}
            </div>
          ) : (
            summary.budgets.map((budget) => {
              const spent = categorySpend(summary, budget.categoryId);
              const available = Math.max(budget.amount - spent, 0);
              const progress =
                budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

              return (
                <article
                  key={budget.id}
                  className="rounded-[30px] bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        {budget.category.name}
                      </h2>
                      <p className="mt-1 text-sm text-black/45">
                        {m['finances.available']()}: {moneyLabel(available)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {Math.round(Math.min(progress, 999))}%
                    </p>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-[#101113]"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <SummaryCard
                      label={m['finances.spent']()}
                      value={moneyLabel(spent)}
                    />
                    <SummaryCard
                      label={m['finances.limit']()}
                      value={moneyLabel(budget.amount)}
                    />
                  </div>
                </article>
              );
            })
          )}
        </section>

        <section className="mt-6 rounded-[30px] bg-white p-5">
          <h2 className="text-lg font-semibold">
            {m['finances.createBudget']()}
          </h2>
          <div className="mt-5 grid gap-3">
            <select
              value={budgetCategoryId}
              onChange={(event) => setBudgetCategoryId(event.target.value)}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            >
              <option value="">{m['finances.selectCategory']()}</option>
              {categories
                .filter(
                  (category) =>
                    category.transactionType === 'EXPENSE' ||
                    category.transactionType === 'BOTH',
                )
                .map((category: FinanceCategory) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <input
              inputMode="decimal"
              value={budgetAmount}
              onChange={(event) => setBudgetAmount(event.target.value)}
              placeholder={m['finances.budgetPlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <Button
              type="button"
              onClick={submitBudget}
              disabled={budgetMutation.isPending}
              className="h-12 rounded-full"
            >
              {budgetMutation.isPending
                ? m['common.saving']()
                : m['finances.saveBudget']()}
            </Button>
          </div>
        </section>
      </ScreenShell>
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
