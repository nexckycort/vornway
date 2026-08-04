import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { formatCurrency } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';
import { FinanceDashboardView } from './-components/finance-dashboard-view';
import { ScreenShell, SummaryCard } from './-components/finance-layout';
import {
  accountsEndpoint,
  accountTypeOptions,
  categoryColors,
  categoryIcons,
  categorySpend,
  closeAccountEndpoint,
  createAccountEndpoint,
  createCategoryEndpoint,
  createTransactionEndpoint,
  currency,
  currentMonthKey,
  deleteAccountEndpoint,
  deleteCategoryEndpoint,
  deleteTransactionEndpoint,
  type EditableFinanceTransaction,
  type FinanceAccount,
  type FinanceAccountInput,
  type FinanceAccountUpdateInput,
  type FinanceBudgetInput,
  type FinanceCategory,
  type FinanceCategoryInput,
  type FinanceCategoryKind,
  type FinanceCategoryUpdateInput,
  type FinanceMovementTransaction,
  type FinanceTransactionInput,
  type FinanceTransactionUpdateInput,
  type FinanceView,
  getAccountStatusLabel,
  getAccountTypeLabel,
  getBrowserTimeZone,
  getCategoryKindLabel,
  getCurrencyValue,
  isFinanceView,
  moneyLabel,
  movementsEndpoint,
  parseMoney,
  parseTagsInput,
  summaryEndpoint,
  tagsToInput,
  toCategoryKind,
  todayKey,
  toInputDate,
  updateAccountEndpoint,
  updateCategoryEndpoint,
  updateTransactionEndpoint,
  upsertBudgetEndpoint,
} from './-components/finance-model';
import {
  CreateTransactionView,
  TransactionDetailView,
} from './-components/finance-transaction-views';

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
  const { view, month, transactionId, accountId } = Route.useSearch();
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
  const [editingTransactionName, setEditingTransactionName] = useState('');
  const [editingTransactionAmount, setEditingTransactionAmount] = useState('');
  const [editingTransactionDate, setEditingTransactionDate] = useState('');
  const [editingTransactionCategoryId, setEditingTransactionCategoryId] =
    useState('');
  const [editingTransactionAccountId, setEditingTransactionAccountId] =
    useState('');
  const [editingTransactionTagsInput, setEditingTransactionTagsInput] =
    useState('');
  const [budgetCategoryId, setBudgetCategoryId] = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [editingAccountId, setEditingAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] =
    useState<FinanceAccountInput['type']>('bank');
  const [accountInstitution, setAccountInstitution] = useState('');
  const [accountCurrency, setAccountCurrency] = useState(currency);
  const [accountCurrentBalance, setAccountCurrentBalance] = useState('');
  const [accountAvailableBalance, setAccountAvailableBalance] = useState('');
  const [accountLockedBalance, setAccountLockedBalance] = useState('');
  const [accountCreditLimit, setAccountCreditLimit] = useState('');
  const [accountOpenedAt, setAccountOpenedAt] = useState('');
  const [accountMaturesAt, setAccountMaturesAt] = useState('');
  const [accountInterestRate, setAccountInterestRate] = useState('');
  const [accountNotes, setAccountNotes] = useState('');

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
  const accountsQuery = useInfiniteQuery({
    queryKey: ['finances-accounts'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const response = await accountsEndpoint({
        query: {
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
    () => movementsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [movementsQuery.data],
  );
  const accounts = useMemo(
    () => accountsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [accountsQuery.data],
  );
  const categories = summary?.categories ?? [];
  const tags = summary?.tags ?? [];
  const transactionAccounts =
    summary?.accounts.filter(
      (account) => account.status !== 'CLOSED' && account.currency === currency,
    ) ?? [];
  const movementTransaction = movements.find(
    (item) => item.source === 'transaction' && item.id === transactionId,
  ) as FinanceMovementTransaction | undefined;
  const transaction =
    summary?.recentTransactions.find((item) => item.id === transactionId) ??
    movementTransaction;
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

  const updateTransactionMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: FinanceTransactionUpdateInput;
    }) => {
      const response = await updateTransactionEndpoint({
        param: { id },
        json: input,
      });
      if (!response.ok) {
        throw new Error(m['finances.transactionUpdateFailed']());
      }
      return response.json();
    },
    onSuccess: async () => {
      await invalidateFinanceQueries();
      toast.success(m['finances.transactionUpdated']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.transactionUpdateFailed'](),
      );
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteTransactionEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.deleteMovementFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateFinanceQueries();
      toast.success(m['finances.movementDeleted']());
      goTo('dashboard');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.deleteMovementFailed'](),
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

  const accountMutation = useMutation({
    mutationFn: async (input: FinanceAccountInput) => {
      const response = editingAccountId
        ? await updateAccountEndpoint({
            param: { id: editingAccountId },
            json: input satisfies FinanceAccountUpdateInput,
          })
        : await createAccountEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.accountSaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateAccountQueries();
      resetAccountForm();
      toast.success(m['finances.accountSaved']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.accountSaveFailed'](),
      );
    },
  });

  const closeAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await closeAccountEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.accountCloseFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateAccountQueries();
      resetAccountForm();
      toast.success(m['finances.accountClosed']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.accountCloseFailed'](),
      );
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await deleteAccountEndpoint({ param: { id } });
      if (!response.ok) throw new Error(m['finances.accountDeleteFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await invalidateAccountQueries();
      resetAccountForm();
      toast.success(m['finances.accountDeleted']());
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : m['finances.accountDeleteFailed'](),
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

  function invalidateAccountQueries() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-accounts'] }),
      queryClient.invalidateQueries({ queryKey: ['finances-account'] }),
      queryClient.invalidateQueries({
        queryKey: ['finances-account-movements'],
      }),
    ]);
  }

  function resetAccountForm() {
    setEditingAccountId('');
    setAccountName('');
    setAccountType('bank');
    setAccountInstitution('');
    setAccountCurrency(currency);
    setAccountCurrentBalance('');
    setAccountAvailableBalance('');
    setAccountLockedBalance('');
    setAccountCreditLimit('');
    setAccountOpenedAt('');
    setAccountMaturesAt('');
    setAccountInterestRate('');
    setAccountNotes('');
  }

  function selectAccountToEdit(account: FinanceAccount) {
    setEditingAccountId(account.id);
    setAccountName(account.name);
    setAccountType(
      account.accountType.toLowerCase() as FinanceAccountInput['type'],
    );
    setAccountInstitution(account.institution ?? '');
    setAccountCurrency(account.currency);
    setAccountCurrentBalance(String(account.currentBalance));
    setAccountAvailableBalance(String(account.availableBalance));
    setAccountLockedBalance(String(account.lockedBalance));
    setAccountCreditLimit(
      account.creditLimit === null ? '' : String(account.creditLimit),
    );
    setAccountOpenedAt(toInputDate(account.openedAt));
    setAccountMaturesAt(toInputDate(account.maturesAt));
    setAccountInterestRate(
      account.interestRate === null ? '' : String(account.interestRate),
    );
    setAccountNotes(account.notes ?? '');
  }

  function submitAccount() {
    const name = accountName.trim();
    const currentBalance = parseMoney(accountCurrentBalance);
    const isCreditCard = accountType === 'credit_card';
    const creditLimit = parseMoney(accountCreditLimit);
    if (!name || !accountCurrency.trim()) {
      toast.error(m['finances.accountValidation']());
      return;
    }

    accountMutation.mutate({
      name,
      type: accountType,
      institution: accountInstitution.trim() || undefined,
      currency: accountCurrency.trim().toUpperCase(),
      currentBalance,
      availableBalance: accountAvailableBalance
        ? parseMoney(accountAvailableBalance)
        : isCreditCard
          ? Math.max(creditLimit - currentBalance, 0)
          : currentBalance,
      lockedBalance: isCreditCard
        ? 0
        : accountLockedBalance
          ? parseMoney(accountLockedBalance)
          : 0,
      ...(isCreditCard && creditLimit > 0 ? { creditLimit } : {}),
      openedAt: accountOpenedAt
        ? new Date(`${accountOpenedAt}T12:00:00`)
        : undefined,
      maturesAt: accountMaturesAt
        ? new Date(`${accountMaturesAt}T12:00:00`)
        : undefined,
      interestRate: accountInterestRate
        ? Number(accountInterestRate.replace(',', '.'))
        : undefined,
      notes: accountNotes.trim() || undefined,
    });
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

  function goBackFromTransaction() {
    if (accountId) {
      void navigate({
        to: '/finances/accounts/$id',
        params: { id: accountId },
        search: {
          view,
          month,
          transactionId,
          accountId,
        },
      });
      return;
    }

    goTo('dashboard');
  }

  function setMonth(nextMonth: string) {
    void navigate({
      search: {
        view,
        month: nextMonth,
        transactionId,
        accountId,
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
      occurredAt: new Date(`${transactionDate}T12:00:00`),
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

  function prepareTransactionEdit(nextTransaction: EditableFinanceTransaction) {
    setEditingTransactionName(nextTransaction.description);
    setEditingTransactionAmount(String(nextTransaction.amount));
    setEditingTransactionDate(toInputDate(nextTransaction.occurredAt));
    setEditingTransactionCategoryId(nextTransaction.categoryId ?? '');
    setEditingTransactionAccountId(nextTransaction.accountId ?? '');
    setEditingTransactionTagsInput(tagsToInput(nextTransaction.tags));
  }

  function submitTransactionUpdate(
    nextTransaction: EditableFinanceTransaction,
  ) {
    const name = editingTransactionName.trim();
    const parsedAmount = parseMoney(editingTransactionAmount);
    if (!name || parsedAmount <= 0 || !editingTransactionDate) {
      toast.error(m['finances.validation']());
      return;
    }

    updateTransactionMutation.mutate({
      id: nextTransaction.id,
      input: {
        description: name,
        amount: parsedAmount,
        occurredAt: new Date(`${editingTransactionDate}T12:00:00`),
        categoryId: editingTransactionCategoryId || null,
        accountId: editingTransactionAccountId || null,
        tags: parseTagsInput(editingTransactionTagsInput),
      },
    });
  }

  async function shareTransaction(nextTransaction: EditableFinanceTransaction) {
    const text = `${nextTransaction.description}: ${formatCurrency(
      nextTransaction.currency,
      nextTransaction.amount,
      { maximumFractionDigits: 0 },
    )}`;

    if (navigator.share) {
      await navigator.share({ text });
      return;
    }

    await navigator.clipboard.writeText(text);
    toast.success(m['finances.movementShared']());
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
  const personalExpense = getCurrencyValue(
    summary.totals.personalExpenseByCurrency,
    currency,
  );
  const groupExpense = getCurrencyValue(
    summary.totals.groupExpenseByCurrency,
    currency,
  );
  const totalExpense = getCurrencyValue(
    summary.totals.totalExpenseByCurrency,
    currency,
  );
  const balance = getCurrencyValue(summary.totals.balanceByCurrency, currency);
  const owedByYou = getCurrencyValue(
    summary.totals.owedByYouByCurrency,
    currency,
  );
  const owedToYou = getCurrencyValue(
    summary.totals.owedToYouByCurrency,
    currency,
  );
  const goalSaved = getCurrencyValue(
    summary.totals.goalSavedByCurrency,
    currency,
  );
  const goalTarget = getCurrencyValue(
    summary.totals.goalTargetByCurrency,
    currency,
  );
  const accountTotal = getCurrencyValue(
    summary.totals.accountTotalByCurrency,
    currency,
  );
  const accountAvailable = getCurrencyValue(
    summary.totals.accountAvailableByCurrency,
    currency,
  );
  const accountLocked = getCurrencyValue(
    summary.totals.accountLockedByCurrency,
    currency,
  );
  const accountCreditLimitTotal = getCurrencyValue(
    summary.totals.accountCreditLimitByCurrency,
    currency,
  );
  const accountCreditUsed = getCurrencyValue(
    summary.totals.accountCreditUsedByCurrency,
    currency,
  );
  const accountCreditAvailable = getCurrencyValue(
    summary.totals.accountCreditAvailableByCurrency,
    currency,
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

  if (view === 'accounts') {
    return (
      <ScreenShell
        title={m['finances.accounts']()}
        month={month}
        onBack={() => goTo('dashboard')}
      >
        <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section className="min-w-0 rounded-[30px] bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {editingAccountId
                  ? m['finances.editAccount']()
                  : m['finances.createAccount']()}
              </h2>
              {editingAccountId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetAccountForm}
                  className="rounded-full"
                >
                  {m['common.cancel']()}
                </Button>
              ) : null}
            </div>
            <div className="mt-5 grid gap-3">
              <input
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder={m['finances.accountNamePlaceholder']()}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              <select
                value={accountType}
                onChange={(event) =>
                  setAccountType(
                    event.target.value as FinanceAccountInput['type'],
                  )
                }
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              >
                {accountTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {getAccountTypeLabel(type)}
                  </option>
                ))}
              </select>
              <input
                value={accountInstitution}
                onChange={(event) => setAccountInstitution(event.target.value)}
                placeholder={m['finances.accountInstitutionPlaceholder']()}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              <div className="grid min-w-0 gap-3 sm:grid-cols-[0.7fr_1fr]">
                <input
                  value={accountCurrency}
                  onChange={(event) => setAccountCurrency(event.target.value)}
                  placeholder={m['finances.accountCurrencyPlaceholder']()}
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm uppercase outline-none"
                />
                <input
                  inputMode="decimal"
                  value={accountCurrentBalance}
                  onChange={(event) =>
                    setAccountCurrentBalance(event.target.value)
                  }
                  placeholder={
                    accountType === 'credit_card'
                      ? m['finances.accountCurrentDebt']()
                      : m['finances.accountCurrentBalance']()
                  }
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
              </div>
              {accountType === 'credit_card' ? (
                <input
                  inputMode="decimal"
                  value={accountCreditLimit}
                  onChange={(event) =>
                    setAccountCreditLimit(event.target.value)
                  }
                  placeholder={m['finances.accountCreditLimit']()}
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
              ) : null}
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <input
                  inputMode="decimal"
                  value={accountAvailableBalance}
                  onChange={(event) =>
                    setAccountAvailableBalance(event.target.value)
                  }
                  placeholder={
                    accountType === 'credit_card'
                      ? m['finances.accountAvailableCredit']()
                      : m['finances.accountAvailableBalance']()
                  }
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
                {accountType === 'credit_card' ? null : (
                  <input
                    inputMode="decimal"
                    value={accountLockedBalance}
                    onChange={(event) =>
                      setAccountLockedBalance(event.target.value)
                    }
                    placeholder={m['finances.accountLockedBalance']()}
                    className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                  />
                )}
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={accountOpenedAt}
                  onChange={(event) => setAccountOpenedAt(event.target.value)}
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
                <input
                  type="date"
                  value={accountMaturesAt}
                  onChange={(event) => setAccountMaturesAt(event.target.value)}
                  className="h-13 min-w-0 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
                />
              </div>
              <input
                inputMode="decimal"
                value={accountInterestRate}
                onChange={(event) => setAccountInterestRate(event.target.value)}
                placeholder={m['finances.accountInterestRate']()}
                className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
              />
              <textarea
                value={accountNotes}
                onChange={(event) => setAccountNotes(event.target.value)}
                placeholder={m['finances.accountNotesPlaceholder']()}
                className="min-h-24 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 py-3 text-sm outline-none"
              />
              <Button
                type="button"
                onClick={submitAccount}
                disabled={accountMutation.isPending}
                className="h-12 rounded-full"
              >
                {accountMutation.isPending
                  ? m['common.saving']()
                  : m['finances.saveAccount']()}
              </Button>
            </div>
          </section>

          <section className="grid min-w-0 gap-3">
            <div className="grid min-w-0 gap-2 sm:grid-cols-3">
              <SummaryCard
                label={m['finances.accountTotal']()}
                value={moneyLabel(accountTotal)}
              />
              <SummaryCard
                label={m['finances.accountAvailable']()}
                value={moneyLabel(accountAvailable)}
              />
              <SummaryCard
                label={m['finances.accountLocked']()}
                value={moneyLabel(accountLocked)}
              />
              <SummaryCard
                label={m['finances.accountCreditLimit']()}
                value={moneyLabel(accountCreditLimitTotal)}
              />
              <SummaryCard
                label={m['finances.accountUsedCredit']()}
                value={moneyLabel(accountCreditUsed)}
              />
              <SummaryCard
                label={m['finances.accountAvailableCredit']()}
                value={moneyLabel(accountCreditAvailable)}
              />
            </div>
            {accounts.length === 0 ? (
              <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
                {m['finances.emptyAccounts']()}
              </div>
            ) : (
              accounts.map((account) => (
                <article
                  key={account.id}
                  className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      void navigate({
                        to: '/finances/accounts/$id',
                        params: { id: account.id },
                        search: {
                          view,
                          month,
                          transactionId,
                          accountId,
                        },
                      })
                    }
                    className="flex w-full min-w-0 items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">
                        {account.name}
                      </h3>
                      <p className="mt-1 truncate text-xs text-black/45">
                        {account.institution ||
                          getAccountTypeLabel(account.accountType)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                          {getAccountTypeLabel(account.accountType)}
                        </span>
                        <span className="rounded-full bg-[#f4f4f2] px-2.5 py-1 text-[11px] font-medium text-black/50">
                          {getAccountStatusLabel(account.status)}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 shrink-0 text-right">
                      <p className="max-w-32 truncate text-lg font-semibold">
                        {formatCurrency(
                          account.currency,
                          account.accountType === 'CREDIT_CARD'
                            ? account.availableBalance
                            : account.currentBalance,
                          { maximumFractionDigits: 0 },
                        )}
                      </p>
                      <p className="max-w-32 truncate text-xs text-black/45">
                        {account.accountType === 'CREDIT_CARD'
                          ? `${m['finances.accountUsedCredit']()} ${formatCurrency(
                              account.currency,
                              account.usedCredit,
                              { maximumFractionDigits: 0 },
                            )}`
                          : `${m['finances.available']()} ${formatCurrency(
                              account.currency,
                              account.availableBalance,
                              { maximumFractionDigits: 0 },
                            )}`}
                      </p>
                      {account.accountType === 'CREDIT_CARD' ? (
                        <p className="max-w-32 truncate text-xs text-black/45">
                          {m['finances.accountCreditLimit']()}{' '}
                          {formatCurrency(
                            account.currency,
                            account.creditLimit ?? 0,
                            {
                              maximumFractionDigits: 0,
                            },
                          )}
                        </p>
                      ) : null}
                    </div>
                  </button>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void navigate({
                          to: '/finances/accounts/$id',
                          params: { id: account.id },
                          search: {
                            view,
                            month,
                            transactionId,
                            accountId,
                          },
                        })
                      }
                      className="rounded-full"
                    >
                      {m['finances.viewAccount']()}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => selectAccountToEdit(account)}
                      className="rounded-full"
                    >
                      {m['finances.editAccount']()}
                    </Button>
                  </div>
                  {editingAccountId === account.id &&
                  account.status !== 'CLOSED' ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (confirm(m['finances.closeAccountConfirm']())) {
                            closeAccountMutation.mutate(account.id);
                          }
                        }}
                        disabled={closeAccountMutation.isPending}
                        className="h-10 rounded-full"
                      >
                        {m['finances.closeAccount']()}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(m['finances.deleteAccountConfirm']())) {
                            deleteAccountMutation.mutate(account.id);
                          }
                        }}
                        disabled={deleteAccountMutation.isPending}
                        className="h-10 rounded-full"
                      >
                        {m['finances.deleteAccount']()}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
            {accountsQuery.hasNextPage ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void accountsQuery.fetchNextPage()}
                disabled={accountsQuery.isFetchingNextPage}
                className="h-11 rounded-full"
              >
                {accountsQuery.isFetchingNextPage
                  ? m['common.loading']()
                  : m['finances.loadMoreAccounts']()}
              </Button>
            ) : null}
          </section>
        </div>
      </ScreenShell>
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

  if (view === 'reports') {
    return (
      <ScreenShell
        title={m['finances.reports']()}
        month={month}
        onBack={() => goTo('dashboard')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.comparison']()}
            </h2>
            <div className="mt-5 grid gap-3">
              <SummaryCard
                label={m['finances.income']()}
                value={moneyLabel(income)}
              />
              <SummaryCard
                label={m['finances.expenses']()}
                value={moneyLabel(totalExpense)}
              />
              <SummaryCard
                label={m['finances.balance']()}
                value={moneyLabel(balance)}
              />
            </div>
          </section>

          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.integrated']()}
            </h2>
            <div className="mt-5 grid gap-3">
              <Link
                to="/debts"
                search={{ from: 'finances' }}
                className="rounded-[24px] bg-[#f7f7f4] p-4 text-sm font-semibold"
              >
                {m['finances.netDebts']()}: {moneyLabel(owedToYou - owedByYou)}
              </Link>
              <Link
                to="/goals"
                className="rounded-[24px] bg-[#f7f7f4] p-4 text-sm font-semibold"
              >
                {m['finances.goalsProgress']()}: {moneyLabel(goalSaved)} /{' '}
                {moneyLabel(goalTarget)}
              </Link>
            </div>
          </section>

          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">
              {m['finances.topCategories']()}
            </h2>
            <div className="mt-5 space-y-4">
              {summary.categoryExpenseTotals.length === 0 ? (
                <p className="text-sm text-black/45">
                  {m['finances.emptyCategories']()}
                </p>
              ) : (
                summary.categoryExpenseTotals.slice(0, 8).map((item) => (
                  <div key={`${item.categoryId ?? 'none'}:${item.currency}`}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium">
                        {item.categoryName}
                      </span>
                      <span className="text-black/45">
                        {formatCurrency(item.currency, item.amount, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-[#101113]"
                        style={{
                          width: `${Math.min(
                            100,
                            totalExpense > 0
                              ? (item.amount / totalExpense) * 100
                              : 0,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[30px] bg-white p-5">
            <h2 className="text-lg font-semibold">{m['finances.topTags']()}</h2>
            <div className="mt-5 space-y-4">
              {summary.tagExpenseTotals.length === 0 ? (
                <p className="text-sm text-black/45">
                  {m['finances.emptyTags']()}
                </p>
              ) : (
                summary.tagExpenseTotals.slice(0, 8).map((item) => (
                  <div key={`${item.tagId}:${item.currency}`}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="truncate font-medium">
                        #{item.tagName}
                      </span>
                      <span className="text-black/45">
                        {formatCurrency(item.currency, item.amount, {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-[#0f766e]"
                        style={{
                          width: `${Math.min(
                            100,
                            totalExpense > 0
                              ? (item.amount / totalExpense) * 100
                              : 0,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </ScreenShell>
    );
  }

  if (view === 'transaction') {
    return (
      <TransactionDetailView
        month={month}
        transaction={transaction}
        categories={categories}
        transactionAccounts={transactionAccounts}
        editingTransactionName={editingTransactionName}
        editingTransactionAmount={editingTransactionAmount}
        editingTransactionDate={editingTransactionDate}
        editingTransactionCategoryId={editingTransactionCategoryId}
        editingTransactionAccountId={editingTransactionAccountId}
        editingTransactionTagsInput={editingTransactionTagsInput}
        isUpdating={updateTransactionMutation.isPending}
        onBack={goBackFromTransaction}
        onShare={(nextTransaction) => {
          void shareTransaction(nextTransaction);
        }}
        onDelete={deleteTransactionMutation.mutate}
        onPrepareEdit={prepareTransactionEdit}
        onEditingNameChange={setEditingTransactionName}
        onEditingAmountChange={setEditingTransactionAmount}
        onEditingDateChange={setEditingTransactionDate}
        onEditingCategoryChange={setEditingTransactionCategoryId}
        onEditingAccountChange={setEditingTransactionAccountId}
        onEditingTagsInputChange={setEditingTransactionTagsInput}
        onSubmitUpdate={submitTransactionUpdate}
      />
    );
  }

  return (
    <FinanceDashboardView
      month={month}
      income={income}
      totalExpense={totalExpense}
      balance={balance}
      groupExpense={groupExpense}
      personalExpense={personalExpense}
      owedToYou={owedToYou}
      owedByYou={owedByYou}
      accountTotal={accountTotal}
      accountAvailable={accountAvailable}
      accountLocked={accountLocked}
      movements={movements}
      loadMoreRef={loadMoreRef}
      isMovementsLoading={movementsQuery.isPending}
      isFetchingNextMovementsPage={movementsQuery.isFetchingNextPage}
      onSetMonth={setMonth}
      onGoTo={goTo}
    />
  );
}
