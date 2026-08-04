import { financesClient } from '#/api/finances';
import type { InferRequestType, InferResponseType } from '#/api/types';
import { formatCurrency, getIntlLocale } from '#/lib/i18n';
import { m } from '#/paraglide/messages.js';

export type FinanceView =
  | 'dashboard'
  | 'new'
  | 'accounts'
  | 'categories'
  | 'budgets'
  | 'reports';

export const summaryEndpoint = financesClient.summary.$get;
export const movementsEndpoint = financesClient.movements.$get;
export const accountsEndpoint = financesClient.accounts.$get;
export const createAccountEndpoint = financesClient.accounts.$post;
export const updateAccountEndpoint = financesClient.accounts[':id'].$patch;
export const deleteAccountEndpoint = financesClient.accounts[':id'].$delete;
export const closeAccountEndpoint = financesClient.accounts[':id'].close.$post;
export const createTransactionEndpoint = financesClient.transactions.$post;
export const getTransactionEndpoint = financesClient.transactions[':id'].$get;
export const updateTransactionEndpoint =
  financesClient.transactions[':id'].$patch;
export const deleteTransactionEndpoint =
  financesClient.transactions[':id'].$delete;
export const createCategoryEndpoint = financesClient.categories.$post;
export const updateCategoryEndpoint = financesClient.categories[':id'].$patch;
export const deleteCategoryEndpoint = financesClient.categories[':id'].$delete;
export const upsertBudgetEndpoint = financesClient.budgets.$post;

export type FinanceSummary = InferResponseType<typeof summaryEndpoint>;
export type FinanceMovementsPage = InferResponseType<typeof movementsEndpoint>;
export type FinanceAccountsPage = InferResponseType<typeof accountsEndpoint>;
export type FinanceAccountInput = InferRequestType<
  typeof createAccountEndpoint
>['json'];
export type FinanceAccountUpdateInput = InferRequestType<
  typeof updateAccountEndpoint
>['json'];
export type FinanceTransactionInput = InferRequestType<
  typeof createTransactionEndpoint
>['json'];
export type FinanceTransactionDetailResponse = InferResponseType<
  typeof getTransactionEndpoint
>;
export type FinanceTransactionDetail = Extract<
  FinanceTransactionDetailResponse,
  { id: string }
>;
export type FinanceTransactionUpdateInput = InferRequestType<
  typeof updateTransactionEndpoint
>['json'];
export type FinanceCategoryInput = InferRequestType<
  typeof createCategoryEndpoint
>['json'];
export type FinanceCategoryUpdateInput = InferRequestType<
  typeof updateCategoryEndpoint
>['json'];
export type FinanceBudgetInput = InferRequestType<
  typeof upsertBudgetEndpoint
>['json'];
export type FinanceCategory = FinanceSummary['categories'][number];
export type FinanceSummaryAccount = FinanceSummary['accounts'][number];
export type FinanceAccount = FinanceAccountsPage['data'][number];
export type FinanceTransaction = FinanceSummary['recentTransactions'][number];
export type FinanceMovement = FinanceMovementsPage['data'][number];
export type FinanceMovementTransaction = Extract<
  FinanceMovement,
  { source: 'transaction' }
>;
export type FinanceGroupExpenseMovement = Extract<
  FinanceMovement,
  { source: 'group-expense' }
>;
export type FinanceDebtPaymentMovement = Extract<
  FinanceMovement,
  { source: 'debt-payment' }
>;
export type FinanceTag = FinanceSummary['tags'][number];
export type FinanceCategoryKind = 'income' | 'expense' | 'both';
export type EditableFinanceTransaction =
  | FinanceTransaction
  | FinanceMovementTransaction
  | FinanceTransactionDetail;

export const currency = 'COP';
export const financeViews = new Set<FinanceView>([
  'dashboard',
  'new',
  'accounts',
  'categories',
  'budgets',
  'reports',
]);
export const categoryColors = [
  '#111827',
  '#2563eb',
  '#16a34a',
  '#db2777',
  '#f59e0b',
  '#7c3aed',
  '#dc2626',
  '#0f766e',
] as const;
export const categoryIcons = [
  'tag',
  'home',
  'utensils',
  'sparkles',
  'bolt',
  'wallet',
];
export const accountTypeOptions = [
  'bank',
  'savings',
  'term_deposit',
  'cash',
  'wallet',
  'credit_card',
  'other',
] as const;

export function isFinanceView(value: unknown): value is FinanceView {
  return typeof value === 'string' && financeViews.has(value as FinanceView);
}

export function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string) {
  const [yearValue, monthValue] = month.split('-').map(Number);
  const year = yearValue ?? new Date().getFullYear();
  const monthIndex = (monthValue ?? 1) - 1;
  return new Intl.DateTimeFormat(getIntlLocale(), {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1, 12));
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function parseMoney(value: string) {
  const normalized = value.replace(/[^\d.,]/g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function toInputDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function getAccountTypeLabel(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === 'bank') return m['finances.accountTypeBank']();
  if (normalized === 'savings') return m['finances.accountTypeSavings']();
  if (normalized === 'term_deposit') {
    return m['finances.accountTypeTermDeposit']();
  }
  if (normalized === 'cash') return m['finances.accountTypeCash']();
  if (normalized === 'wallet') return m['finances.accountTypeWallet']();
  if (normalized === 'credit_card') {
    return m['finances.accountTypeCreditCard']();
  }
  return m['finances.accountTypeOther']();
}

export function getAccountStatusLabel(status: string) {
  if (status === 'CLOSED') return m['finances.accountStatusClosed']();
  if (status === 'MATURED') return m['finances.accountStatusMatured']();
  return m['finances.accountStatusActive']();
}

export function getCurrencyValue(
  values: Record<string, number>,
  selected: string,
) {
  return values[selected] ?? 0;
}

export function moneyLabel(amount: number) {
  return formatCurrency(currency, amount, { maximumFractionDigits: 0 });
}

export function parseTagsInput(value: string) {
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

export function tagsToInput(tags: Array<{ name: string }>) {
  return tags.map((tag) => `#${tag.name}`).join(' ');
}

export function appendTagToInput(value: string, tagName: string) {
  const tags = parseTagsInput(value);
  if (!tags.includes(tagName)) tags.push(tagName);
  return tags.map((tag) => `#${tag}`).join(' ');
}

export function toCategoryKind(
  transactionType: FinanceCategory['transactionType'],
): FinanceCategoryKind {
  if (transactionType === 'INCOME') return 'income';
  if (transactionType === 'EXPENSE') return 'expense';
  return 'both';
}

export function getCategoryKindLabel(kind: FinanceCategoryKind) {
  if (kind === 'income') return m['finances.income']();
  if (kind === 'expense') return m['finances.expense']();
  return m['finances.both']();
}

export function isCategoryAllowedForTransaction(
  category: FinanceCategory,
  transaction: EditableFinanceTransaction,
) {
  return (
    category.transactionType === 'BOTH' ||
    (transaction.type === 'INCOME' && category.transactionType === 'INCOME') ||
    (transaction.type === 'EXPENSE' && category.transactionType === 'EXPENSE')
  );
}

export function categorySpend(summary: FinanceSummary, categoryId: string) {
  return summary.categoryExpenseTotals
    .filter(
      (item) => item.categoryId === categoryId && item.currency === currency,
    )
    .reduce((total, item) => total + item.amount, 0);
}
