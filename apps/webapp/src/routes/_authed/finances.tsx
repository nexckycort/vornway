import {
  Add01Icon,
  MoreVerticalIcon,
  PiggyBankIcon,
  TargetIcon,
  UserGroupIcon,
  Wallet02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { financesClient } from '#/api/finances';
import type { InferRequestType, InferResponseType } from '#/api/types';
import { Button } from '#/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';

type FinanceView =
  | 'dashboard'
  | 'new'
  | 'categories'
  | 'budgets'
  | 'reports'
  | 'transaction';

export const Route = createFileRoute('/_authed/finances')({
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
  }),
  component: RouteComponent,
});

const summaryEndpoint = financesClient.summary.$get;
const createTransactionEndpoint = financesClient.transactions.$post;
const updateTransactionEndpoint = financesClient.transactions[':id'].$patch;
const deleteTransactionEndpoint = financesClient.transactions[':id'].$delete;
const createCategoryEndpoint = financesClient.categories.$post;
const updateCategoryEndpoint = financesClient.categories[':id'].$patch;
const deleteCategoryEndpoint = financesClient.categories[':id'].$delete;
const upsertBudgetEndpoint = financesClient.budgets.$post;

type FinanceSummary = InferResponseType<typeof summaryEndpoint>;
type FinanceTransactionInput = InferRequestType<
  typeof createTransactionEndpoint
>['json'];
type FinanceTransactionUpdateInput = InferRequestType<
  typeof updateTransactionEndpoint
>['json'];
type FinanceCategoryInput = InferRequestType<
  typeof createCategoryEndpoint
>['json'];
type FinanceCategoryUpdateInput = InferRequestType<
  typeof updateCategoryEndpoint
>['json'];
type FinanceBudgetInput = InferRequestType<typeof upsertBudgetEndpoint>['json'];
type FinanceCategory = FinanceSummary['categories'][number];
type FinanceTransaction = FinanceSummary['recentTransactions'][number];
type FinanceTag = FinanceSummary['tags'][number];
type FinanceCategoryKind = 'income' | 'expense' | 'both';

const currency = 'COP';
const financeViews = new Set<FinanceView>([
  'dashboard',
  'new',
  'categories',
  'budgets',
  'reports',
  'transaction',
]);
const categoryColors = [
  '#111827',
  '#2563eb',
  '#16a34a',
  '#db2777',
  '#f59e0b',
  '#7c3aed',
  '#dc2626',
  '#0f766e',
] as const;
const categoryIcons = ['tag', 'home', 'utensils', 'sparkles', 'bolt', 'wallet'];

function isFinanceView(value: unknown): value is FinanceView {
  return typeof value === 'string' && financeViews.has(value as FinanceView);
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseMoney(value: string) {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function getCurrencyValue(values: Record<string, number>, selected: string) {
  return values[selected] ?? 0;
}

function moneyLabel(amount: number) {
  return formatCurrency(currency, amount, { maximumFractionDigits: 0 });
}

function parseTagsInput(value: string) {
  const tags = value
    .split(/[\s,]+/)
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/^#+/, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    )
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 10);
}

function tagsToInput(tags: FinanceTransaction['tags']) {
  return tags.map((tag) => `#${tag.name}`).join(' ');
}

function appendTagToInput(value: string, tagName: string) {
  const tags = parseTagsInput(value);
  if (!tags.includes(tagName)) tags.push(tagName);
  return tags.map((tag) => `#${tag}`).join(' ');
}

function toCategoryKind(
  transactionType: FinanceCategory['transactionType'],
): FinanceCategoryKind {
  if (transactionType === 'INCOME') return 'income';
  if (transactionType === 'EXPENSE') return 'expense';
  return 'both';
}

function getCategoryKindLabel(kind: FinanceCategoryKind) {
  if (kind === 'income') return m['finances.income']();
  if (kind === 'expense') return m['finances.expense']();
  return m['finances.both']();
}

function isCategoryAllowedForTransaction(
  category: FinanceCategory,
  transaction: FinanceTransaction,
) {
  return (
    category.transactionType === 'BOTH' ||
    (transaction.type === 'INCOME' && category.transactionType === 'INCOME') ||
    (transaction.type === 'EXPENSE' && category.transactionType === 'EXPENSE')
  );
}

function categorySpend(summary: FinanceSummary, categoryId: string) {
  return summary.categoryExpenseTotals
    .filter(
      (item) => item.categoryId === categoryId && item.currency === currency,
    )
    .reduce((total, item) => total + item.amount, 0);
}

function ScreenShell({
  title,
  month,
  onBack,
  children,
}: {
  title: string;
  month: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#101113]">
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-5 pb-28 pt-6 md:max-w-5xl">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-11 items-center justify-center rounded-full border border-black/10 bg-white text-xl"
            aria-label={m['finances.back']()}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div className="min-w-0 text-center">
            <p className="text-xs font-medium text-black/45">{month}</p>
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
          <div className="size-11" />
        </header>
        <div className="mt-7">{children}</div>
      </div>
    </main>
  );
}

function BalanceCard({
  month,
  income,
  totalExpense,
  balance,
  onMonthChange,
}: {
  month: string;
  income: number;
  totalExpense: number;
  balance: number;
  onMonthChange: (month: string) => void;
}) {
  return (
    <section className="rounded-[32px] bg-[#101113] p-6 text-white">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-sm text-white/55">
            {m['finances.monthBalance']()}
          </p>
          <p className="mt-3 text-4xl font-semibold leading-none tracking-normal">
            {moneyLabel(balance)}
          </p>
        </div>
        <label className="grid gap-1 text-xs font-medium text-white/55">
          {m['finances.month']()}
          <input
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
            className="h-10 rounded-full border border-white/10 bg-white/10 px-3 text-sm text-white outline-none"
          />
        </label>
      </div>
      <div className="mt-7 grid grid-cols-3 gap-3">
        <BalanceMetric
          label={m['finances.income']()}
          value={moneyLabel(income)}
        />
        <BalanceMetric
          label={m['finances.expenses']()}
          value={moneyLabel(totalExpense)}
        />
        <BalanceMetric
          label={m['finances.balance']()}
          value={moneyLabel(balance)}
        />
      </div>
    </section>
  );
}

function BalanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ActionCard({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: typeof Add01Icon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-28 rounded-[28px] border border-black/5 bg-white p-4 text-left transition active:scale-[0.99]"
    >
      <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f0f2ee] text-[#101113]">
        <HugeiconsIcon icon={icon} className="size-5" />
      </div>
      <p className="mt-4 text-base font-semibold leading-tight">{title}</p>
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-black/5 bg-white p-4">
      <p className="text-sm text-black/45">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold">{value}</p>
    </div>
  );
}

function CategoryBars({
  summary,
  totalExpense,
  onOpenReports,
}: {
  summary: FinanceSummary;
  totalExpense: number;
  onOpenReports: () => void;
}) {
  const topCategories = summary.categoryExpenseTotals.slice(0, 5);

  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">
          {m['finances.topCategories']()}
        </h2>
        <button
          type="button"
          onClick={onOpenReports}
          className="text-sm font-medium text-black/55"
        >
          {m['finances.viewAnalysis']()}
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {topCategories.length === 0 ? (
          <p className="text-sm text-black/45">
            {m['finances.emptyCategories']()}
          </p>
        ) : (
          topCategories.map((item) => (
            <div key={`${item.categoryId ?? 'none'}:${item.currency}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">
                  {item.categoryName}
                </span>
                <span className="text-black/45">
                  {formatCurrency(item.currency, item.amount, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
                <div
                  className="h-full rounded-full bg-[#101113]"
                  style={{
                    width: `${Math.min(
                      100,
                      totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TransactionAvatar({
  transaction,
}: {
  transaction: FinanceTransaction;
}) {
  const label =
    transaction.category?.name?.slice(0, 1) ??
    transaction.description.slice(0, 1) ??
    '?';

  return (
    <div
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: transaction.category?.color ?? '#101113' }}
    >
      {label.toUpperCase()}
    </div>
  );
}

function RecentTransactions({
  transactions,
  onOpen,
}: {
  transactions: FinanceTransaction[];
  onOpen: (transaction: FinanceTransaction) => void;
}) {
  const recentTransactions = transactions.slice(0, 5);

  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-5">
      <h2 className="text-lg font-semibold">
        {m['finances.recentTransactions']()}
      </h2>
      <div className="mt-4 divide-y divide-black/5">
        {recentTransactions.length === 0 ? (
          <p className="py-4 text-sm text-black/45">
            {m['finances.emptyTransactions']()}
          </p>
        ) : (
          recentTransactions.map((transaction) => (
            <button
              key={transaction.id}
              type="button"
              onClick={() => onOpen(transaction)}
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <TransactionAvatar transaction={transaction} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {transaction.description}
                </p>
                <p className="mt-0.5 truncate text-xs text-black/45">
                  {transaction.category?.name ?? m['finances.noCategory']()} ·{' '}
                  {formatShortDate(transaction.occurredAt)}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold ${
                  transaction.type === 'INCOME'
                    ? 'text-[#047857]'
                    : 'text-[#b45309]'
                }`}
              >
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(transaction.currency, transaction.amount, {
                  maximumFractionDigits: 0,
                })}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const { view, month, transactionId } = Route.useSearch();
  const timeZone = getBrowserTimeZone();

  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    'expense',
  );
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(todayKey);
  const [categoryId, setCategoryId] = useState('');
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
  const [editingTransactionCategoryId, setEditingTransactionCategoryId] =
    useState('');
  const [editingTransactionTagsInput, setEditingTransactionTagsInput] =
    useState('');
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

  const summary = summaryQuery.data;
  const categories = summary?.categories ?? [];
  const tags = summary?.tags ?? [];
  const transaction = summary?.recentTransactions.find(
    (item) => item.id === transactionId,
  );
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

  const categoryMutation = useMutation({
    mutationFn: async (input: FinanceCategoryInput) => {
      const response = await createCategoryEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.categorySaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['finances-summary'] });
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
      await queryClient.invalidateQueries({ queryKey: ['finances-summary'] });
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
      await queryClient.invalidateQueries({ queryKey: ['finances-summary'] });
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
      queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
    ]);
  }

  function goTo(nextView: FinanceView, nextTransactionId?: string) {
    void navigate({
      search: {
        view: nextView,
        month,
        transactionId: nextTransactionId,
      },
    });
  }

  function setMonth(nextMonth: string) {
    void navigate({
      search: {
        view,
        month: nextMonth,
        transactionId,
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

  function prepareTransactionEdit(nextTransaction: FinanceTransaction) {
    setEditingTransactionName(nextTransaction.description);
    setEditingTransactionCategoryId(nextTransaction.categoryId ?? '');
    setEditingTransactionTagsInput(tagsToInput(nextTransaction.tags));
  }

  function submitTransactionUpdate(nextTransaction: FinanceTransaction) {
    const name = editingTransactionName.trim();
    if (!name) {
      toast.error(m['finances.validation']());
      return;
    }

    updateTransactionMutation.mutate({
      id: nextTransaction.id,
      input: {
        description: name,
        categoryId: editingTransactionCategoryId || null,
        tags: parseTagsInput(editingTransactionTagsInput),
      },
    });
  }

  async function shareTransaction(nextTransaction: FinanceTransaction) {
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

  if (view === 'new') {
    return (
      <ScreenShell
        title={m['finances.addTransaction']()}
        month={month}
        onBack={() => goTo('dashboard')}
      >
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-2 rounded-full bg-white p-1">
            {(['expense', 'income'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTransactionType(type);
                  setCategoryId('');
                }}
                className={`h-11 rounded-full text-sm font-medium ${
                  transactionType === type
                    ? 'bg-[#101113] text-white'
                    : 'text-black/50'
                }`}
              >
                {type === 'expense'
                  ? m['finances.expense']()
                  : m['finances.income']()}
              </button>
            ))}
          </div>

          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={m['finances.amountPlaceholder']()}
            className="h-20 rounded-[28px] border border-black/5 bg-white px-5 text-3xl font-semibold outline-none"
          />
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
          >
            <option value="">{m['finances.noCategory']()}</option>
            {transactionCategories.map((category: FinanceCategory) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={
              transactionType === 'income'
                ? m['finances.incomePlaceholder']()
                : m['finances.expensePlaceholder']()
            }
            className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
          />
          <input
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
          />
          <input
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder={m['finances.tagsPlaceholder']()}
            className="h-14 rounded-[22px] border border-black/5 bg-white px-4 text-base outline-none"
          />
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 10).map((tag: FinanceTag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    setTagsInput((current) =>
                      appendTagToInput(current, tag.name),
                    )
                  }
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black/55"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            onClick={submitTransaction}
            disabled={createTransactionMutation.isPending}
            className="h-14 rounded-full"
          >
            {createTransactionMutation.isPending
              ? m['common.saving']()
              : m['finances.saveTransaction']()}
          </Button>
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
    if (!transaction) {
      return (
        <ScreenShell
          title={m['finances.movement']()}
          month={month}
          onBack={() => goTo('dashboard')}
        >
          <div className="rounded-[30px] bg-white p-5 text-sm text-black/45">
            {m['finances.movementNotFound']()}
          </div>
        </ScreenShell>
      );
    }

    return (
      <ScreenShell
        title={m['finances.movement']()}
        month={month}
        onBack={() => goTo('dashboard')}
      >
        <section className="rounded-[34px] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-black/45">
                {transaction.category?.name ?? m['finances.noCategory']()}
              </p>
              <p className="mt-3 text-4xl font-semibold leading-none">
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(transaction.currency, transaction.amount, {
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex size-11 items-center justify-center rounded-full border border-black/10 bg-white outline-none">
                <HugeiconsIcon icon={MoreVerticalIcon} className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => shareTransaction(transaction)}>
                  {m['finances.share']()}
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    if (confirm(m['finances.deleteMovementConfirm']())) {
                      deleteTransactionMutation.mutate(transaction.id);
                    }
                  }}
                >
                  {m['common.delete']()}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-7 grid gap-4 text-sm">
            <SummaryCard
              label={m['finances.description']()}
              value={transaction.description}
            />
            <SummaryCard
              label={m['finances.date']()}
              value={formatShortDate(transaction.occurredAt)}
            />
            <div className="rounded-[26px] border border-black/5 bg-white p-4">
              <p className="text-sm text-black/45">{m['finances.tags']()}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {transaction.tags.length === 0 ? (
                  <span className="text-sm text-black/45">
                    {m['finances.emptyTags']()}
                  </span>
                ) : (
                  transaction.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-[#f7f7f4] px-3 py-1.5 text-xs font-medium"
                    >
                      #{tag.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[30px] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">
              {m['finances.editMovement']()}
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => prepareTransactionEdit(transaction)}
              className="rounded-full"
            >
              {m['finances.loadData']()}
            </Button>
          </div>
          <div className="mt-5 grid gap-3">
            <input
              value={editingTransactionName}
              onChange={(event) =>
                setEditingTransactionName(event.target.value)
              }
              placeholder={m['finances.expensePlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <select
              value={editingTransactionCategoryId}
              onChange={(event) =>
                setEditingTransactionCategoryId(event.target.value)
              }
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            >
              <option value="">{m['finances.noCategory']()}</option>
              {categories
                .filter((category) =>
                  isCategoryAllowedForTransaction(category, transaction),
                )
                .map((category: FinanceCategory) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
            <input
              value={editingTransactionTagsInput}
              onChange={(event) =>
                setEditingTransactionTagsInput(event.target.value)
              }
              placeholder={m['finances.tagsPlaceholder']()}
              className="h-13 rounded-[20px] border border-black/5 bg-[#f7f7f4] px-4 text-sm outline-none"
            />
            <Button
              type="button"
              onClick={() => submitTransactionUpdate(transaction)}
              disabled={updateTransactionMutation.isPending}
              className="h-12 rounded-full"
            >
              {updateTransactionMutation.isPending
                ? m['common.saving']()
                : m['finances.saveMovementChanges']()}
            </Button>
          </div>
        </section>
      </ScreenShell>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#101113]">
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col px-5 pb-28 pt-7 md:max-w-5xl">
        <header>
          <p className="text-sm font-medium text-black/45">
            {m['finances.eyebrow']()}
          </p>
          <h1 className="mt-1 text-4xl font-semibold leading-none">
            {m['finances.title']()}
          </h1>
        </header>

        <div className="mt-7">
          <BalanceCard
            month={month}
            income={income}
            totalExpense={totalExpense}
            balance={balance}
            onMonthChange={setMonth}
          />
        </div>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <ActionCard
            title={m['finances.addTransaction']()}
            icon={Add01Icon}
            onClick={() => goTo('new')}
          />
          <ActionCard
            title={m['finances.categories']()}
            icon={TargetIcon}
            onClick={() => goTo('categories')}
          />
          <ActionCard
            title={m['finances.budgets']()}
            icon={PiggyBankIcon}
            onClick={() => goTo('budgets')}
          />
          <ActionCard
            title={m['finances.reports']()}
            icon={Wallet02Icon}
            onClick={() => goTo('reports')}
          />
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            label={m['finances.personalExpenses']()}
            value={moneyLabel(personalExpense)}
          />
          <SummaryCard
            label={m['finances.groupExpenses']()}
            value={moneyLabel(groupExpense)}
          />
          <button type="button" onClick={() => void navigate({ to: '/debts' })}>
            <SummaryCard
              label={m['finances.owedToYou']()}
              value={moneyLabel(owedToYou)}
            />
          </button>
          <button type="button" onClick={() => void navigate({ to: '/debts' })}>
            <SummaryCard
              label={m['finances.youOwe']()}
              value={moneyLabel(owedByYou)}
            />
          </button>
        </section>

        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_0.95fr]">
          <CategoryBars
            summary={summary}
            totalExpense={totalExpense}
            onOpenReports={() => goTo('reports')}
          />
          <section className="rounded-[30px] border border-black/5 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f0f2ee]">
                <HugeiconsIcon icon={UserGroupIcon} className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {m['finances.goalsProgress']()}
                </h2>
                <p className="mt-1 text-sm text-black/45">
                  {moneyLabel(goalSaved)} / {moneyLabel(goalTarget)}
                </p>
              </div>
            </div>
            <Link
              to="/goals"
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#101113] px-4 text-sm font-medium text-white"
            >
              {m['finances.viewGoals']()}
            </Link>
          </section>
        </div>

        <div className="mt-5">
          <RecentTransactions
            transactions={summary.recentTransactions}
            onOpen={(nextTransaction) =>
              goTo('transaction', nextTransaction.id)
            }
          />
        </div>
      </div>
    </main>
  );
}
