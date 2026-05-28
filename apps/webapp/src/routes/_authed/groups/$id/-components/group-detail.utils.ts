import type { ExpenseItem } from '../-types/group-detail.types';

const moneyFormatCache = new Map<string, Intl.NumberFormat>();
const shortDateFormatCache = new Map<string, Intl.DateTimeFormat>();
const timelineDateFormatCache = new Map<string, Intl.DateTimeFormat>();

function getMoneyFormatter(currency: string) {
  const cached = moneyFormatCache.get(currency);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });
  moneyFormatCache.set(currency, formatter);
  return formatter;
}

function getShortDateFormatter() {
  const key = 'es-CO:short';
  const cached = shortDateFormatCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
  });
  shortDateFormatCache.set(key, formatter);
  return formatter;
}

function getTimelineDateFormatter() {
  const key = 'es-CO:timeline';
  const cached = timelineDateFormatCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  timelineDateFormatCache.set(key, formatter);
  return formatter;
}

export function formatMoney(currency: string, amount: number): string {
  try {
    return getMoneyFormatter(currency).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getShortDateFormatter().format(date);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getShortDateFormatter().format(date);
}

export function formatTimelineDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getTimelineDateFormatter().format(date);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function sumByCurrency(
  items: Array<{ currency: string; amount: number }>,
) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
    return acc;
  }, {});
}

export function groupExpensesByDate(expenses: ExpenseItem[]) {
  const groups: Array<{ label: string; items: ExpenseItem[] }> = [];

  for (const expense of expenses) {
    const label = getExpenseDateGroupLabel(expense.date);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.label === label) {
      lastGroup.items.push(expense);
      continue;
    }

    groups.push({ label, items: [expense] });
  }

  return groups;
}

export function getExpenseDateGroupLabel(value: string): string {
  const expenseDate = new Date(value);
  if (Number.isNaN(expenseDate.getTime())) return '';

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const expenseDay = new Date(
    expenseDate.getFullYear(),
    expenseDate.getMonth(),
    expenseDate.getDate(),
  ).getTime();
  const diffDays = Math.round((today - expenseDay) / 86_400_000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return formatTimelineDate(value);
}

export function getExpenseEmoji(expense: ExpenseItem): string {
  if (expense.isSettlement) return '🤝';
  if (expense.expenseType === 'composite') return '🧾';

  const text =
    `${expense.description} ${expense.category?.name ?? ''}`.toLowerCase();

  if (/(hotel|hostal|airbnb|estadia|estadía|lodg|aloj)/.test(text)) return '🏨';
  if (
    /(comida|cena|almuerzo|desayuno|rest|restaurant|caf[eé]|bar|snack)/.test(
      text,
    )
  ) {
    return '🍽️';
  }
  if (
    /(bus|vuelo|flight|taxi|uber|transporte|metro|tren|ticket|tickets)/.test(
      text,
    )
  ) {
    return '🎫';
  }

  return '💸';
}

export function getExpenseRowTag(
  expense: ExpenseItem,
  isPinned: boolean,
): {
  label: string;
  tone: 'emerald' | 'rose' | 'blue' | 'amber' | 'slate';
} | null {
  if (expense.isSettlement) {
    return { label: 'Liquidación', tone: 'emerald' };
  }

  if (expense.currentUserBalance !== null && expense.participantCount > 0) {
    if (expense.currentUserBalance > 0) {
      return {
        label: `Te deben ${formatMoney(expense.currency, expense.currentUserBalance)}`,
        tone: 'emerald',
      };
    }

    if (expense.currentUserBalance < 0) {
      return {
        label: `Debes ${formatMoney(expense.currency, Math.abs(expense.currentUserBalance))}`,
        tone: 'rose',
      };
    }
  }

  if (expense.expenseType === 'composite') {
    return {
      label: `${expense.subExpenseCount} subgasto${expense.subExpenseCount === 1 ? '' : 's'}`,
      tone: 'blue',
    };
  }

  if (isPinned) {
    return { label: 'Fijado', tone: 'amber' };
  }

  return null;
}
