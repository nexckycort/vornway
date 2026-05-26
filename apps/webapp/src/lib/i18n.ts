import { getLocale, setLocale } from '#/paraglide/runtime.js';

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type AppLocale = keyof typeof languages;

function normalizeLocale(locale: string): AppLocale {
  return locale === 'en' ? 'en' : 'es';
}

export function getCurrentLocale(): AppLocale {
  return normalizeLocale(getLocale());
}

export function getIntlLocale(locale: AppLocale = getCurrentLocale()) {
  return locale === 'en' ? 'en-US' : 'es-CO';
}

export async function changeLocale(locale: AppLocale) {
  await setLocale(locale);
}

export function formatCurrency(
  currency: string,
  amount: number,
  options?: Intl.NumberFormatOptions,
) {
  try {
    return new Intl.NumberFormat(getIntlLocale(), {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString(getIntlLocale())} ${currency}`;
  }
}

export function formatShortDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatLongDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(getIntlLocale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date, fallback = '') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(getIntlLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
