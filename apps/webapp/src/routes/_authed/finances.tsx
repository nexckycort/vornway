import {
  Add01Icon,
  PiggyBankIcon,
  TargetIcon,
  UserGroupIcon,
  Wallet02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { financesClient } from '#/api/finances';
import type { InferRequestType, InferResponseType } from '#/api/types';
import { Button } from '#/components/ui/button';
import { formatCurrency, formatShortDate } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';

export const Route = createFileRoute('/_authed/finances')({
  component: RouteComponent,
});

const summaryEndpoint = financesClient.summary.$get;
const createTransactionEndpoint = financesClient.transactions.$post;
const updateTransactionEndpoint = financesClient.transactions[':id'].$patch;
const createCategoryEndpoint = financesClient.categories.$post;
const updateCategoryEndpoint = financesClient.categories[':id'].$patch;
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
type FinanceCategoryKind = 'income' | 'expense' | 'both';

const currency = 'COP';

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'income' | 'expense' | 'debt';
}) {
  const toneClass = {
    neutral: 'bg-white text-[#0f172a]',
    income: 'bg-[#ecfdf5] text-[#065f46]',
    expense: 'bg-[#fff7ed] text-[#9a3412]',
    debt: 'bg-[#fef2f2] text-[#991b1b]',
  }[tone];

  return (
    <div className={`rounded-[22px] border border-[#e5e7eb] p-4 ${toneClass}`}>
      <p className="text-xs font-medium text-current/70">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

function RouteComponent() {
  const queryClient = useQueryClient();
  const timeZone = getBrowserTimeZone();
  const [month, setMonth] = useState(currentMonthKey);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>(
    'expense',
  );
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] =
    useState<FinanceCategoryKind>('both');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingCategoryType, setEditingCategoryType] =
    useState<FinanceCategoryKind>('both');
  const [editingTransactionId, setEditingTransactionId] = useState('');
  const [editingTransactionName, setEditingTransactionName] = useState('');
  const [editingTransactionCategoryId, setEditingTransactionCategoryId] =
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

  const categories = summaryQuery.data?.categories ?? [];
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setDescription('');
      setAmount('');
      setCategoryId('');
      toast.success(m['finances.transactionSaved']());
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['finances-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
      ]);
      setEditingTransactionId('');
      setEditingTransactionName('');
      setEditingTransactionCategoryId('');
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

  const budgetMutation = useMutation({
    mutationFn: async (input: FinanceBudgetInput) => {
      const response = await upsertBudgetEndpoint({ json: input });
      if (!response.ok) throw new Error(m['finances.budgetSaveFailed']());
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['finances-summary'],
      });
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
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({
        queryKey: ['finances-summary'],
      });
      setNewCategoryName('');
      if (
        category.transactionType === 'EXPENSE' ||
        category.transactionType === 'BOTH'
      ) {
        setCategoryId(category.id);
        setBudgetCategoryId(category.id);
      } else {
        setCategoryId(category.id);
      }
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
      await queryClient.invalidateQueries({
        queryKey: ['finances-summary'],
      });
      setEditingCategoryId(category.id);
      setEditingCategoryName(category.name);
      setEditingCategoryType(toCategoryKind(category.transactionType));
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

  const summary = summaryQuery.data;
  const income = summary
    ? getCurrencyValue(summary.totals.incomeByCurrency, currency)
    : 0;
  const personalExpense = summary
    ? getCurrencyValue(summary.totals.personalExpenseByCurrency, currency)
    : 0;
  const groupExpense = summary
    ? getCurrencyValue(summary.totals.groupExpenseByCurrency, currency)
    : 0;
  const totalExpense = summary
    ? getCurrencyValue(summary.totals.totalExpenseByCurrency, currency)
    : 0;
  const balance = summary
    ? getCurrencyValue(summary.totals.balanceByCurrency, currency)
    : 0;
  const owedByYou = summary
    ? getCurrencyValue(summary.totals.owedByYouByCurrency, currency)
    : 0;
  const owedToYou = summary
    ? getCurrencyValue(summary.totals.owedToYouByCurrency, currency)
    : 0;
  const goalSaved = summary
    ? getCurrencyValue(summary.totals.goalSavedByCurrency, currency)
    : 0;
  const goalTarget = summary
    ? getCurrencyValue(summary.totals.goalTargetByCurrency, currency)
    : 0;

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
    });
  }

  function selectCategoryToEdit(nextCategoryId: string) {
    setEditingCategoryId(nextCategoryId);
    const selectedCategory = categories.find(
      (category) => category.id === nextCategoryId,
    );
    if (!selectedCategory) {
      setEditingCategoryName('');
      setEditingCategoryType('both');
      return;
    }

    setEditingCategoryName(selectedCategory.name);
    setEditingCategoryType(toCategoryKind(selectedCategory.transactionType));
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
      },
    });
  }

  function selectTransactionToEdit(transaction: FinanceTransaction) {
    setEditingTransactionId(transaction.id);
    setEditingTransactionName(transaction.description);
    setEditingTransactionCategoryId(transaction.categoryId ?? '');
  }

  function submitTransactionUpdate(transaction: FinanceTransaction) {
    const name = editingTransactionName.trim();
    if (!name) {
      toast.error(m['finances.validation']());
      return;
    }

    updateTransactionMutation.mutate({
      id: transaction.id,
      input: {
        description: name,
        categoryId: editingTransactionCategoryId || null,
      },
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-[#0f172a]">
      <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col px-4 pb-32 pt-6 md:max-w-5xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">
              {m['finances.eyebrow']()}
            </p>
            <h1 className="mt-1 text-3xl font-semibold leading-9">
              {m['finances.title']()}
            </h1>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-[#64748b]">
            {m['finances.month']()}
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-10 rounded-full border border-[#e2e8f0] bg-white px-3 text-sm text-[#0f172a] outline-none"
            />
          </label>
        </header>

        {summaryQuery.isLoading ? (
          <div className="mt-6 rounded-[24px] border border-[#e2e8f0] bg-white p-5 text-sm text-[#64748b]">
            {m['common.loading']()}
          </div>
        ) : null}

        {summaryQuery.isError ? (
          <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {m['finances.loadError']()}
          </div>
        ) : null}

        {summary ? (
          <>
            <section className="mt-6 rounded-[28px] bg-[#111827] p-5 text-white shadow-[0_18px_42px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/65">
                    {m['finances.monthBalance']()}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-normal">
                    {moneyLabel(balance)}
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/12">
                  <HugeiconsIcon icon={Wallet02Icon} className="size-6" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-white/55">
                    {m['finances.income']()}
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {moneyLabel(income)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/55">
                    {m['finances.expenses']()}
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {moneyLabel(totalExpense)}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile
                label={m['finances.personalExpenses']()}
                value={moneyLabel(personalExpense)}
                tone="expense"
              />
              <StatTile
                label={m['finances.groupExpenses']()}
                value={moneyLabel(groupExpense)}
                tone="neutral"
              />
              <StatTile
                label={m['finances.youOwe']()}
                value={moneyLabel(owedByYou)}
                tone="debt"
              />
              <StatTile
                label={m['finances.owedToYou']()}
                value={moneyLabel(owedToYou)}
                tone="income"
              />
            </section>

            <section className="mt-5 rounded-[26px] border border-[#e2e8f0] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857]">
                  <HugeiconsIcon icon={Add01Icon} className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">
                    {m['finances.addTransaction']()}
                  </h2>
                  <p className="text-xs text-[#64748b]">
                    {m['finances.addTransactionHint']()}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-[#f1f5f9] p-1">
                {(['expense', 'income'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTransactionType(type);
                      setCategoryId('');
                    }}
                    className={`h-10 rounded-full text-sm font-medium ${
                      transactionType === type
                        ? 'bg-white text-[#0f172a] shadow-sm'
                        : 'text-[#64748b]'
                    }`}
                  >
                    {type === 'expense'
                      ? m['finances.expense']()
                      : m['finances.income']()}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px]">
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    transactionType === 'income'
                      ? m['finances.incomePlaceholder']()
                      : m['finances.expensePlaceholder']()
                  }
                  className="h-12 rounded-2xl border border-[#e2e8f0] px-4 text-sm outline-none"
                />
                <input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={m['finances.amountPlaceholder']()}
                  className="h-12 rounded-2xl border border-[#e2e8f0] px-4 text-sm outline-none"
                />
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none md:col-span-2"
                >
                  <option value="">{m['finances.noCategory']()}</option>
                  {transactionCategories.map((category: FinanceCategory) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                onClick={submitTransaction}
                disabled={createTransactionMutation.isPending}
                className="mt-4 h-12 w-full rounded-full"
              >
                {createTransactionMutation.isPending
                  ? m['common.saving']()
                  : m['finances.saveTransaction']()}
              </Button>
            </section>

            <section className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="rounded-[26px] border border-[#e2e8f0] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f8fafc] text-[#334155]">
                    <HugeiconsIcon icon={TargetIcon} className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">
                      {m['finances.categories']()}
                    </h2>
                    <p className="text-xs text-[#64748b]">
                      {m['finances.categoriesHint']()}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-full bg-[#f1f5f9] p-1">
                  {(['both', 'expense', 'income'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewCategoryType(type)}
                      className={`h-10 rounded-full text-sm font-medium ${
                        newCategoryType === type
                          ? 'bg-white text-[#0f172a] shadow-sm'
                          : 'text-[#64748b]'
                      }`}
                    >
                      {type === 'both'
                        ? m['finances.both']()
                        : type === 'expense'
                          ? m['finances.expense']()
                          : m['finances.income']()}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  <input
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder={m['finances.categoryPlaceholder']()}
                    className="h-12 rounded-2xl border border-[#e2e8f0] px-4 text-sm outline-none"
                  />
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

                <div className="mt-4 flex flex-wrap gap-2">
                  {categories.map((category: FinanceCategory) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => selectCategoryToEdit(category.id)}
                      className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs font-medium text-[#475569]"
                    >
                      <span className="truncate">{category.name}</span>
                      <span className="text-[#94a3b8]">
                        {getCategoryKindLabel(
                          toCategoryKind(category.transactionType),
                        )}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 border-t border-[#e2e8f0] pt-4">
                  <h3 className="text-sm font-semibold text-[#0f172a]">
                    {m['finances.editCategory']()}
                  </h3>
                  <div className="mt-3 grid gap-3">
                    <select
                      value={editingCategoryId}
                      onChange={(event) =>
                        selectCategoryToEdit(event.target.value)
                      }
                      className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
                    >
                      <option value="">
                        {m['finances.chooseCategoryToEdit']()}
                      </option>
                      {categories.map((category: FinanceCategory) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <input
                      value={editingCategoryName}
                      onChange={(event) =>
                        setEditingCategoryName(event.target.value)
                      }
                      placeholder={m['finances.categoryPlaceholder']()}
                      className="h-12 rounded-2xl border border-[#e2e8f0] px-4 text-sm outline-none"
                    />

                    <div className="grid grid-cols-3 gap-2 rounded-full bg-[#f1f5f9] p-1">
                      {(['both', 'expense', 'income'] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setEditingCategoryType(type)}
                          className={`h-10 rounded-full text-sm font-medium ${
                            editingCategoryType === type
                              ? 'bg-white text-[#0f172a] shadow-sm'
                              : 'text-[#64748b]'
                          }`}
                        >
                          {getCategoryKindLabel(type)}
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={submitCategoryUpdate}
                      disabled={
                        updateCategoryMutation.isPending || !editingCategoryId
                      }
                      className="h-12 rounded-full"
                    >
                      {updateCategoryMutation.isPending
                        ? m['common.saving']()
                        : m['finances.saveCategoryChanges']()}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-[26px] border border-[#e2e8f0] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f46e5]">
                    <HugeiconsIcon icon={PiggyBankIcon} className="size-5" />
                  </div>
                  <h2 className="text-base font-semibold">
                    {m['finances.budgets']()}
                  </h2>
                </div>

                <div className="mt-4 grid gap-3">
                  <select
                    value={budgetCategoryId}
                    onChange={(event) =>
                      setBudgetCategoryId(event.target.value)
                    }
                    className="h-12 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
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
                    className="h-12 rounded-2xl border border-[#e2e8f0] px-4 text-sm outline-none"
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

                <div className="mt-4 space-y-3">
                  {summary.budgets.length === 0 ? (
                    <p className="text-sm text-[#64748b]">
                      {m['finances.emptyBudgets']()}
                    </p>
                  ) : (
                    summary.budgets.map((budget) => (
                      <div
                        key={budget.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fafc] px-4 py-3"
                      >
                        <span className="truncate text-sm font-medium">
                          {budget.category.name}
                        </span>
                        <span className="text-sm text-[#64748b]">
                          {moneyLabel(budget.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[26px] border border-[#e2e8f0] bg-white p-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#c2410c]">
                    <HugeiconsIcon icon={UserGroupIcon} className="size-5" />
                  </div>
                  <h2 className="text-base font-semibold">
                    {m['finances.integrated']()}
                  </h2>
                </div>
                <div className="mt-4 grid gap-3">
                  <StatTile
                    label={m['finances.groupExpenses']()}
                    value={moneyLabel(groupExpense)}
                    tone="neutral"
                  />
                  <StatTile
                    label={m['finances.goalsProgress']()}
                    value={`${moneyLabel(goalSaved)} / ${moneyLabel(goalTarget)}`}
                    tone="income"
                  />
                  <StatTile
                    label={m['finances.netDebts']()}
                    value={moneyLabel(owedToYou - owedByYou)}
                    tone="debt"
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link
                    to="/goals"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm font-medium text-[#334155]"
                  >
                    {m['finances.viewGoals']()}
                  </Link>
                  <Link
                    to="/debts"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-4 text-sm font-medium text-[#334155]"
                  >
                    {m['finances.viewDebts']()}
                  </Link>
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-[26px] border border-[#e2e8f0] bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f8fafc] text-[#334155]">
                  <HugeiconsIcon icon={TargetIcon} className="size-5" />
                </div>
                <h2 className="text-base font-semibold">
                  {m['finances.topCategories']()}
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {summary.categoryExpenseTotals.length === 0 ? (
                  <p className="text-sm text-[#64748b]">
                    {m['finances.emptyCategories']()}
                  </p>
                ) : (
                  summary.categoryExpenseTotals.slice(0, 5).map((item) => (
                    <div key={`${item.categoryId ?? 'none'}:${item.currency}`}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">
                          {item.categoryName}
                        </span>
                        <span className="text-[#64748b]">
                          {formatCurrency(item.currency, item.amount, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
                        <div
                          className="h-full rounded-full bg-primary"
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

            <section className="mt-5 rounded-[26px] border border-[#e2e8f0] bg-white p-4">
              <h2 className="text-base font-semibold">
                {m['finances.recentTransactions']()}
              </h2>
              <div className="mt-4 space-y-3">
                {summary.recentTransactions.length === 0 ? (
                  <p className="text-sm text-[#64748b]">
                    {m['finances.emptyTransactions']()}
                  </p>
                ) : (
                  summary.recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-2xl bg-[#f8fafc] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-[#64748b]">
                            {transaction.category?.name ??
                              m['finances.noCategory']()}{' '}
                            · {formatShortDate(transaction.occurredAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => selectTransactionToEdit(transaction)}
                            className="h-8 rounded-full border border-[#e2e8f0] bg-white px-3 text-xs font-medium text-[#475569]"
                          >
                            {m['finances.editMovement']()}
                          </button>
                          <span
                            className={`text-sm font-semibold ${
                              transaction.type === 'INCOME'
                                ? 'text-[#047857]'
                                : 'text-[#b45309]'
                            }`}
                          >
                            {transaction.type === 'INCOME' ? '+' : '-'}
                            {formatCurrency(
                              transaction.currency,
                              transaction.amount,
                              { maximumFractionDigits: 0 },
                            )}
                          </span>
                        </div>
                      </div>
                      {editingTransactionId === transaction.id ? (
                        <div className="mt-3 grid gap-3 border-t border-[#e2e8f0] pt-3">
                          <input
                            value={editingTransactionName}
                            onChange={(event) =>
                              setEditingTransactionName(event.target.value)
                            }
                            className="h-11 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
                          />
                          <select
                            value={editingTransactionCategoryId}
                            onChange={(event) =>
                              setEditingTransactionCategoryId(
                                event.target.value,
                              )
                            }
                            className="h-11 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-sm outline-none"
                          >
                            <option value="">
                              {m['finances.noCategory']()}
                            </option>
                            {categories
                              .filter((category) =>
                                isCategoryAllowedForTransaction(
                                  category,
                                  transaction,
                                ),
                              )
                              .map((category: FinanceCategory) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setEditingTransactionId('')}
                              className="h-11 rounded-full"
                            >
                              {m['common.cancel']()}
                            </Button>
                            <Button
                              type="button"
                              onClick={() =>
                                submitTransactionUpdate(transaction)
                              }
                              disabled={updateTransactionMutation.isPending}
                              className="h-11 rounded-full"
                            >
                              {updateTransactionMutation.isPending
                                ? m['common.saving']()
                                : m['finances.saveMovementChanges']()}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
