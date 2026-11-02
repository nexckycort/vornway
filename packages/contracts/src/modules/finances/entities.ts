import { Schema } from 'effect';
import { literalsWithFallback, Page } from '../../schema.ts';

const nullableString = Schema.NullOr(Schema.String);
const nullableNumber = Schema.NullOr(Schema.Number);
const nullableDate = Schema.NullOr(Schema.Date);

export const FinanceTransactionType = literalsWithFallback(
  ['INCOME', 'EXPENSE', 'BOTH'],
  'unknown',
);

export const FinanceAccount = Schema.Struct({
  id: Schema.String,
  ownerId: Schema.String,
  name: Schema.String,
  accountType: literalsWithFallback(
    [
      'CASH',
      'BANK',
      'SAVINGS',
      'CREDIT_CARD',
      'TERM_DEPOSIT',
      'WALLET',
      'OTHER',
    ],
    'unknown',
  ),
  institution: nullableString,
  currency: Schema.String,
  openingBalance: Schema.Number,
  currentBalance: Schema.Number,
  availableBalance: Schema.Number,
  lockedBalance: Schema.Number,
  creditLimit: nullableNumber,
  usedCredit: Schema.Number,
  interestRate: nullableNumber,
  openedAt: nullableDate,
  maturesAt: nullableDate,
  status: literalsWithFallback(['ACTIVE', 'CLOSED', 'MATURED'], 'unknown'),
  notes: nullableString,
  closedAt: nullableDate,
  archivedAt: nullableDate,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export const FinanceAccountPage = Page(FinanceAccount);

export const FinanceCategory = Schema.Struct({
  id: Schema.String,
  ownerId: Schema.String,
  name: Schema.String,
  transactionType: FinanceTransactionType,
  icon: nullableString,
  color: nullableString,
  isDefault: Schema.Boolean,
  archivedAt: nullableDate,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export const CategoryRef = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: nullableString,
  color: nullableString,
});

export const FinanceTag = Schema.Struct({
  id: Schema.String,
  ownerId: Schema.String,
  name: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export const FinanceBudget = Schema.Struct({
  id: Schema.String,
  ownerId: Schema.String,
  categoryId: Schema.String,
  month: Schema.Date,
  amount: Schema.Number,
  currency: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
});

export const FinanceBudgetWithCategory = Schema.Struct({
  ...FinanceBudget.fields,
  category: FinanceCategory,
});

const financeTransactionFields = {
  id: Schema.String,
  ownerId: Schema.String,
  accountId: nullableString,
  categoryId: nullableString,
  type: FinanceTransactionType,
  amount: Schema.Number,
  currency: Schema.String,
  description: Schema.String,
  occurredAt: Schema.Date,
  notes: nullableString,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  category: Schema.NullOr(FinanceCategory),
  account: Schema.NullOr(FinanceAccount),
};

export const FinanceTransaction = Schema.Struct({
  ...financeTransactionFields,
  tags: Schema.Array(FinanceTag),
});

export const FinanceTransactionWithTagLinks = Schema.Struct({
  ...financeTransactionFields,
  tags: Schema.Array(
    Schema.Struct({
      transactionId: Schema.String,
      tagId: Schema.String,
      tag: FinanceTag,
    }),
  ),
});

export const FinanceDeleted = Schema.Struct({ ok: Schema.Literal(true) });
