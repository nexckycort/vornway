import { m } from '#/paraglide/messages.js';

export const currencyMeta: Record<
  string,
  { flag: string; label: string; symbol: string }
> = {
  COP: { flag: '🇨🇴', label: m['common.currency.copFull'](), symbol: '$' },
  EUR: { flag: '🇪🇺', label: m['common.currency.eurFull'](), symbol: '€' },
  USD: { flag: '🇺🇸', label: m['common.currency.usdFull'](), symbol: 'US$' },
  GBP: { flag: '🇬🇧', label: m['common.currency.gbpFull'](), symbol: '£' },
  MXN: { flag: '🇲🇽', label: m['common.currency.mxnFull'](), symbol: '$' },
  BRL: { flag: '🇧🇷', label: m['common.currency.brlFull'](), symbol: 'R$' },
};

export type Step = 1 | 2;

export type SettlementOption = {
  key: string;
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  currency: string;
  amount: number;
};

export function formatCompactAmount(currency: string, amount: number) {
  const hasDecimals = Math.abs(amount % 1) > 0.000001;

  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-CO', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    })} ${currency}`;
  }
}

export function formatAmountInput(currency: string, digits: string) {
  const normalizedDigits = digits.includes(',') ? digits : `${digits},00`;
  const [integerPart, decimalPart = '00'] = normalizedDigits.split(',');
  const amount = parseEditableAmount(normalizedDigits);
  const formattedAmount = formatCompactAmount(currency, amount);
  const safeIntegerPart = integerPart || '0';
  const safeDecimalPart = decimalPart.padEnd(2, '0').slice(0, 2);

  try {
    const formattedInteger = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.parseInt(safeIntegerPart, 10) || 0);

    return `${formattedInteger},${safeDecimalPart}`;
  } catch {
    void formattedAmount;
    return `${safeIntegerPart},${safeDecimalPart} ${currency}`;
  }
}

export function formatEditableAmount(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace('.', ',');
}

export function parseEditableAmount(value: string) {
  return Number.parseFloat(value.replace(',', '.')) || 0;
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
