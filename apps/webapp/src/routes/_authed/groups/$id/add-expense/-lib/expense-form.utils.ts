import { api } from '#/api/client';
import type { ExpenseAdvancedDetails } from '#/routes/_authed/groups/$id/-types/group-detail.types';
import type { ExpenseLineItem, SharedExpenseItem } from './expense-form.types';

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getCurrencySymbol(currency: string) {
  switch (currency) {
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'BRL':
      return 'R$';
    default:
      return '$';
  }
}

export function normalizeCategoryIconInput(value: string) {
  return Array.from(value.trim()).slice(0, 4).join('');
}

export function normalizeAdvancedDetails(
  details: ExpenseAdvancedDetails,
): ExpenseAdvancedDetails | null {
  const next: ExpenseAdvancedDetails = {
    type: details.type,
    placeName: details.placeName?.trim() || undefined,
    address: details.address?.trim() || undefined,
    mapUrl: details.mapUrl?.trim() || undefined,
    mapEmbedUrl: details.mapEmbedUrl?.trim() || undefined,
    contactName: details.contactName?.trim() || undefined,
    phone: details.phone?.trim() || undefined,
    email: details.email?.trim() || undefined,
    bookingCode: details.bookingCode?.trim() || undefined,
    reservationTime: details.reservationTime?.trim() || undefined,
    websiteUrl: details.websiteUrl?.trim() || undefined,
    notes: details.notes?.trim() || undefined,
  };

  const hasContent = Object.entries(next).some(
    ([key, value]) => key !== 'type' && Boolean(value),
  );

  return hasContent ? next : null;
}

export async function resolveAdvancedDetailsMap(
  details: ExpenseAdvancedDetails,
): Promise<ExpenseAdvancedDetails> {
  if (!details.mapUrl || details.mapEmbedUrl) return details;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return details;

  try {
    const resolution = await api.maps.resolve.request({
      payload: { url: details.mapUrl },
    });

    if (!resolution.embedUrl) return details;

    return {
      ...details,
      mapEmbedUrl: resolution.embedUrl,
    };
  } catch {
    return details;
  }
}

export function formatEditableNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function splitAmountEqually(amount: number, count: number): string[] {
  if (count <= 0) return [];

  const equalValue = formatEditableNumber(amount / count);
  return Array.from({ length: count }, () => equalValue);
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

export function tagsToInput(tags: string[] | undefined) {
  return (tags ?? []).map((tag) => `#${tag}`).join(' ');
}

export function createSharedExpenseItem(
  partial?: Partial<Pick<SharedExpenseItem, 'name' | 'amount'>>,
): SharedExpenseItem {
  return {
    id: createId(),
    name: partial?.name ?? '',
    amount: partial?.amount ?? '',
  };
}

export function createExpenseLineItem(
  memberId: string,
  partial?: Partial<Pick<ExpenseLineItem, 'description' | 'amount'>>,
): ExpenseLineItem {
  return {
    id: createId(),
    memberId,
    description: partial?.description ?? '',
    amount: partial?.amount ?? '',
  };
}
