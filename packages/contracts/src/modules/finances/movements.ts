import { Schema } from 'effect';
import { Page } from '../../schema.ts';
import { CategoryRef, FinanceCategory, FinanceTag } from './entities.ts';

const nullableString = Schema.NullOr(Schema.String);
const movementType = Schema.Literals(['INCOME', 'EXPENSE']);

const GroupExpenseMovementFields = {
  id: Schema.String,
  groupId: Schema.String,
  groupName: Schema.String,
  groupType: Schema.String,
  description: Schema.String,
  amount: Schema.Number,
  userShare: Schema.Number,
  currentUserBalance: Schema.NullOr(Schema.Number),
  currency: Schema.String,
  occurredAt: Schema.String,
  category: Schema.NullOr(CategoryRef),
};

export const GroupExpenseSummaryMovement = Schema.Struct({
  ...GroupExpenseMovementFields,
  tags: Schema.Array(Schema.String),
});

export const FinanceMovement = Schema.Union([
  Schema.Struct({
    source: Schema.Literal('transaction'),
    id: Schema.String,
    description: Schema.String,
    amount: Schema.Number,
    currency: Schema.String,
    occurredAt: Schema.String,
    type: movementType,
    accountId: nullableString,
    accountName: nullableString,
    categoryId: nullableString,
    category: Schema.NullOr(FinanceCategory),
    tags: Schema.Array(FinanceTag),
  }),
  Schema.Struct({
    source: Schema.Literal('group-expense'),
    ...GroupExpenseMovementFields,
  }),
  Schema.Struct({
    source: Schema.Literal('debt-loan'),
    id: Schema.String,
    debtId: Schema.String,
    debtName: Schema.String,
    counterpartyName: Schema.String,
    description: Schema.String,
    amount: Schema.Number,
    currency: Schema.String,
    occurredAt: Schema.String,
    type: movementType,
    accountId: nullableString,
    accountName: nullableString,
  }),
  Schema.Struct({
    source: Schema.Literal('debt-payment'),
    id: Schema.String,
    debtId: Schema.String,
    debtName: Schema.String,
    counterpartyName: Schema.String,
    description: Schema.String,
    amount: Schema.Number,
    currency: Schema.String,
    occurredAt: Schema.String,
    type: movementType,
  }),
]);

export const FinanceMovementPage = Page(FinanceMovement);

export const AccountMovement = Schema.Union([
  Schema.Struct({
    source: Schema.Literal('transaction'),
    id: Schema.String,
    description: Schema.String,
    amount: Schema.Number,
    currency: Schema.String,
    occurredAt: Schema.String,
    type: movementType,
    accountId: nullableString,
    categoryId: nullableString,
    category: Schema.NullOr(FinanceCategory),
    tags: Schema.Array(FinanceTag),
  }),
  Schema.Struct({
    source: Schema.Literal('group-expense'),
    id: Schema.String,
    description: Schema.String,
    amount: Schema.Number,
    currency: Schema.String,
    occurredAt: Schema.String,
    type: Schema.Literal('EXPENSE'),
    accountId: nullableString,
    categoryId: nullableString,
    category: Schema.NullOr(CategoryRef),
    tags: Schema.Array(FinanceTag),
    groupId: Schema.String,
    groupName: Schema.String,
  }),
]);

export const AccountMovementPage = Page(AccountMovement);
