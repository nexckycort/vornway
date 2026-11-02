import { addCurrencyTotal, money } from './money';
import {
  accountTotals,
  type debtTotals,
  debtViewerDirection,
  type goalTotals,
  type groupExpenseTotals,
} from './totals';

export const RECENT_LIMIT = 12;

type DebtMovement = {
  amount: number;
  debt: { ownerId: string; direction: string; currency: string };
};

type TransactionLink = { tag: { name: string } };

export const buildSummary = (input: {
  userId: string;
  currency: string;
  monthKey: string;
  transactions: readonly {
    type: string;
    amount: number;
    currency: string;
    categoryId: string | null;
    category: { name: string } | null;
    tags: ReadonlyArray<TransactionLink>;
  }[];
  accounts: Parameters<typeof accountTotals>[0];
  groupExpenses: ReturnType<typeof groupExpenseTotals>;
  debts: ReturnType<typeof debtTotals>;
  debtPayments: readonly DebtMovement[];
  debtLoans: readonly DebtMovement[];
  goals: ReturnType<typeof goalTotals>;
}) => {
  const incomeByCurrency: Record<string, number> = {};
  const personalExpenseByCurrency: Record<string, number> = {};
  const categoryExpenseTotals = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      currency: string;
      amount: number;
    }
  >();
  const tagExpenseTotals = new Map<
    string,
    { tagId: string; tagName: string; currency: string; amount: number }
  >();

  const addCategoryExpense = (
    categoryId: string | null,
    categoryName: string,
    currency: string,
    amount: number,
  ) => {
    const key = `${categoryId ?? 'none'}:${currency}`;
    categoryExpenseTotals.set(key, {
      categoryId,
      categoryName,
      currency,
      amount: money((categoryExpenseTotals.get(key)?.amount ?? 0) + amount),
    });
  };
  const addTagExpense = (tag: string, currency: string, amount: number) => {
    const key = `${tag}:${currency}`;
    tagExpenseTotals.set(key, {
      tagId: tag,
      tagName: tag,
      currency,
      amount: money((tagExpenseTotals.get(key)?.amount ?? 0) + amount),
    });
  };

  for (const transaction of input.transactions) {
    if (transaction.type === 'INCOME') {
      addCurrencyTotal(
        incomeByCurrency,
        transaction.currency,
        transaction.amount,
      );
      continue;
    }

    addCurrencyTotal(
      personalExpenseByCurrency,
      transaction.currency,
      transaction.amount,
    );
    addCategoryExpense(
      transaction.categoryId,
      transaction.category?.name ?? 'Sin categoria',
      transaction.currency,
      transaction.amount,
    );
    for (const link of transaction.tags) {
      addTagExpense(link.tag.name, transaction.currency, transaction.amount);
    }
  }

  for (const loan of input.debtLoans) {
    addCurrencyTotal(
      debtViewerDirection(loan.debt, input.userId) === 'lent'
        ? personalExpenseByCurrency
        : incomeByCurrency,
      loan.debt.currency,
      loan.amount,
    );
  }

  for (const payment of input.debtPayments) {
    addCurrencyTotal(
      debtViewerDirection(payment.debt, input.userId) === 'lent'
        ? incomeByCurrency
        : personalExpenseByCurrency,
      payment.debt.currency,
      payment.amount,
    );
  }

  for (const movement of input.groupExpenses.movements) {
    addCategoryExpense(
      movement.category?.id ?? null,
      movement.category?.name ?? 'Sin categoria',
      movement.currency,
      movement.userShare,
    );
    for (const tag of movement.tags) {
      addTagExpense(tag, movement.currency, movement.userShare);
    }
  }

  const totalExpenseByCurrency = { ...personalExpenseByCurrency };
  for (const [currency, amount] of Object.entries(input.groupExpenses.totals)) {
    addCurrencyTotal(totalExpenseByCurrency, currency, amount);
  }

  const balanceByCurrency = Object.fromEntries(
    [
      ...new Set([
        ...Object.keys(incomeByCurrency),
        ...Object.keys(totalExpenseByCurrency),
      ]),
    ].map((currency) => [
      currency,
      money(
        (incomeByCurrency[currency] ?? 0) -
          (totalExpenseByCurrency[currency] ?? 0),
      ),
    ]),
  );
  const accounts = accountTotals(input.accounts);

  return {
    month: input.monthKey,
    currency: input.currency,
    totals: {
      incomeByCurrency,
      personalExpenseByCurrency,
      groupExpenseByCurrency: input.groupExpenses.totals,
      totalExpenseByCurrency,
      balanceByCurrency,
      owedByYouByCurrency: input.debts.owedByYou,
      owedToYouByCurrency: input.debts.owedToYou,
      goalTargetByCurrency: input.goals.target,
      goalSavedByCurrency: input.goals.saved,
      accountTotalByCurrency: accounts.totalByCurrency,
      accountAvailableByCurrency: accounts.availableByCurrency,
      accountLockedByCurrency: accounts.lockedByCurrency,
      accountCreditLimitByCurrency: accounts.creditLimitByCurrency,
      accountCreditUsedByCurrency: accounts.creditUsedByCurrency,
      accountCreditAvailableByCurrency: accounts.creditAvailableByCurrency,
    },
    counts: {
      transactions: input.transactions.length,
      groupExpenses: input.groupExpenses.count,
    },
    categoryExpenseTotals: Array.from(categoryExpenseTotals.values()).sort(
      (a, b) => b.amount - a.amount,
    ),
    tagExpenseTotals: Array.from(tagExpenseTotals.values()).sort(
      (a, b) => b.amount - a.amount,
    ),
    recentGroupExpenseMovements: input.groupExpenses.movements.slice(
      0,
      RECENT_LIMIT,
    ),
  };
};
