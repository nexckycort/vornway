import { Schema } from 'effect';
import {
  FinanceAccount,
  FinanceBudgetWithCategory,
  FinanceCategory,
  FinanceTag,
  FinanceTransaction,
} from './entities.ts';
import { GroupExpenseSummaryMovement } from './movements.ts';

const CurrencyTotals = Schema.Record(Schema.String, Schema.Number);

export const FinanceSummary = Schema.Struct({
  month: Schema.String,
  currency: Schema.String,
  totals: Schema.Struct({
    incomeByCurrency: CurrencyTotals,
    personalExpenseByCurrency: CurrencyTotals,
    groupExpenseByCurrency: CurrencyTotals,
    totalExpenseByCurrency: CurrencyTotals,
    balanceByCurrency: CurrencyTotals,
    owedByYouByCurrency: CurrencyTotals,
    owedToYouByCurrency: CurrencyTotals,
    goalTargetByCurrency: CurrencyTotals,
    goalSavedByCurrency: CurrencyTotals,
    accountTotalByCurrency: CurrencyTotals,
    accountAvailableByCurrency: CurrencyTotals,
    accountLockedByCurrency: CurrencyTotals,
    accountCreditLimitByCurrency: CurrencyTotals,
    accountCreditUsedByCurrency: CurrencyTotals,
    accountCreditAvailableByCurrency: CurrencyTotals,
  }),
  counts: Schema.Struct({
    transactions: Schema.Int,
    groupExpenses: Schema.Int,
  }),
  categories: Schema.Array(FinanceCategory),
  accounts: Schema.Array(FinanceAccount),
  tags: Schema.Array(FinanceTag),
  budgets: Schema.Array(FinanceBudgetWithCategory),
  categoryExpenseTotals: Schema.Array(
    Schema.Struct({
      categoryId: Schema.NullOr(Schema.String),
      categoryName: Schema.String,
      currency: Schema.String,
      amount: Schema.Number,
    }),
  ),
  tagExpenseTotals: Schema.Array(
    Schema.Struct({
      tagId: Schema.String,
      tagName: Schema.String,
      currency: Schema.String,
      amount: Schema.Number,
    }),
  ),
  recentTransactions: Schema.Array(FinanceTransaction),
  recentGroupExpenseMovements: Schema.Array(GroupExpenseSummaryMovement),
});
