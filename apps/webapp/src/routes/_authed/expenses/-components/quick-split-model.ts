import { m } from '#/paraglide/messages.js';
import type { getQuickSplitMessages } from '../-messages';

export type QuickSplitSearch = {
  friendIds: string[];
  from: 'home' | 'friends';
  quickSplitId?: string;
  expenseId?: string;
};

export type SelectedFriend = {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  userId?: string;
};

export type SplitMethod = 'equal' | 'percentage' | 'exact';

export const splitMethods: SplitMethod[] = ['equal', 'percentage', 'exact'];

export const currencyOptions = [
  { code: 'COP', name: m['common.currency.copFull'](), flag: '🇨🇴' },
  { code: 'USD', name: m['common.currency.usdFull'](), flag: '🇺🇸' },
  { code: 'EUR', name: m['common.currency.eurFull'](), flag: '🇪🇺' },
] as const;

export function readCurrencyCode(
  value: string,
): (typeof currencyOptions)[number]['code'] | null {
  if (value === 'COP' || value === 'USD' || value === 'EUR') {
    return value;
  }

  return null;
}

export function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
}

export function formatAmountInput(value: string): string {
  const normalized = value.replace(/[^\d]/g, '');
  if (!normalized) return '';

  return new Intl.NumberFormat('es-CO').format(Number(normalized));
}

export function parseAmountInput(value: string): number {
  const normalized = value.replace(/[^\d]/g, '');
  return normalized ? Number(normalized) : 0;
}

export function formatEditableNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function getSplitMethodLabel(
  method: SplitMethod,
  t: ReturnType<typeof getQuickSplitMessages>,
) {
  if (method === 'equal') return t.splitEqual;
  if (method === 'percentage') return t.splitPercentage;
  return t.splitExact;
}

export function getSplitMethodDescription(
  method: SplitMethod,
  t: ReturnType<typeof getQuickSplitMessages>,
) {
  if (method === 'equal') return t.splitEqualCopy;
  if (method === 'percentage') return t.splitPercentageCopy;
  return t.splitExactCopy;
}
