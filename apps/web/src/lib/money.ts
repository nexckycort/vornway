const amountFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function truncateMoneyAmount(amount: number): number {
  return Math.trunc(amount * 100) / 100;
}

export function formatMoneyAmount(amount: number): string {
  return amountFormatter.format(truncateMoneyAmount(amount));
}

export function formatMoney(amount: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase();
  const truncatedAmount = truncateMoneyAmount(amount);

  if (!normalizedCurrency) {
    return formatMoneyAmount(truncatedAmount);
  }

  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(truncatedAmount);
  } catch {
    return `${normalizedCurrency} ${formatMoneyAmount(truncatedAmount)}`;
  }
}
