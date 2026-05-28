import { getLocale, setLocale } from '#/paraglide/runtime.js';

export const languages = {
  es: 'Español',
  en: 'English',
} as const;

export type AppLocale = keyof typeof languages;
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const shortDateFormatters = new Map<string, Intl.DateTimeFormat>();
const longDateFormatters = new Map<string, Intl.DateTimeFormat>();
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();

function getCurrencyFormatter(
  locale: AppLocale,
  currency: string,
  options?: Intl.NumberFormatOptions,
) {
  const key = `${locale}:${currency}:${JSON.stringify(options ?? {})}`;
  const cached = currencyFormatters.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...options,
  });
  currencyFormatters.set(key, formatter);
  return formatter;
}

function getDateFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions,
) {
  const key = `${locale}:${JSON.stringify(options)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(getIntlLocale(locale), options);
  cache.set(key, formatter);
  return formatter;
}

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
    return getCurrencyFormatter(getCurrentLocale(), currency, options).format(
      amount,
    );
  } catch {
    return `${amount.toLocaleString(getIntlLocale())} ${currency}`;
  }
}

export function formatShortDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return getDateFormatter(shortDateFormatters, getCurrentLocale(), {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatLongDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return getDateFormatter(longDateFormatters, getCurrentLocale(), {
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

  return getDateFormatter(dateTimeFormatters, getCurrentLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
