export const money = (value: number) => Number(value.toFixed(2));

export const addCurrencyTotal = (
  totals: Record<string, number>,
  currency: string,
  amount: number,
) => {
  totals[currency] = money((totals[currency] ?? 0) + amount);
};
