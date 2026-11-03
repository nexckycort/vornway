import type { ApiSuccess } from '@vornway/api-client';

export type Debt = ApiSuccess<'debts', 'get'>;

export type Activity = {
  kind: 'loan' | 'payment';
  id: string;
  amount: number;
  date: string;
  note?: string | null;
};

export function formatDebtAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-CO')} ${currency}`;
  }
}
