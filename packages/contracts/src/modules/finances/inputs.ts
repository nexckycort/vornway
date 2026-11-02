import { Effect, Schema, SchemaGetter } from 'effect';
import { TrimmedString } from '../../schema.ts';

const Id = Schema.String.check(Schema.isMinLength(1));
const MonthKey = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}$/));
const Limit = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 50 }));
const Money = Schema.Finite;
const PositiveMoney = Schema.Finite.check(Schema.isGreaterThan(0));
const NonNegativeMoney = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0));

const upperCased = SchemaGetter.transform((value: string) =>
  value.toUpperCase(),
);

const TrimmedCurrency = TrimmedString.pipe(
  Schema.decode({ decode: upperCased, encode: upperCased }),
).check(Schema.isBetweenLength(3, 3));

export const Currency = TrimmedCurrency.pipe(
  Schema.withDecodingDefaultTypeKey(Effect.succeed('COP')),
);

const shortTags = Schema.Array(
  TrimmedString.check(Schema.isBetweenLength(1, 40)),
).check(Schema.isMaxLength(10));

export const IdParams = Schema.Struct({ id: Id });

export const SummaryQuery = Schema.Struct({
  month: Schema.optionalKey(MonthKey),
  currency: Currency,
  timeZone: Schema.optionalKey(
    TrimmedString.check(Schema.isBetweenLength(1, 80)),
  ),
});

export const TransactionListQuery = Schema.Struct({
  limit: Limit.pipe(Schema.withDecodingDefaultTypeKey(Effect.succeed(20))),
});

export const MovementListQuery = Schema.Struct({
  ...SummaryQuery.fields,
  limit: TransactionListQuery.fields.limit,
  cursor: Schema.optionalKey(TrimmedString.check(Schema.isMinLength(1))),
});

export const AccountMovementListQuery = Schema.Struct({
  limit: TransactionListQuery.fields.limit,
  cursor: Schema.optionalKey(TrimmedString.check(Schema.isMinLength(1))),
});

const accountName = TrimmedString.check(Schema.isBetweenLength(1, 100));
const accountType = Schema.Literals([
  'cash',
  'bank',
  'savings',
  'credit_card',
  'term_deposit',
  'wallet',
  'other',
]);
const institution = TrimmedString.check(Schema.isMaxLength(100));
const interestRate = Money.check(
  Schema.isBetween({ minimum: 0, maximum: 100 }),
);
const notes = TrimmedString.check(Schema.isMaxLength(500));

export const CreateAccountPayload = Schema.Struct({
  name: accountName,
  type: accountType,
  institution: Schema.optionalKey(institution),
  currency: Currency,
  currentBalance: Money,
  availableBalance: Schema.optionalKey(Money),
  lockedBalance: Schema.optionalKey(NonNegativeMoney),
  creditLimit: Schema.optionalKey(PositiveMoney),
  openedAt: Schema.optionalKey(Schema.Date),
  maturesAt: Schema.optionalKey(Schema.Date),
  interestRate: Schema.optionalKey(interestRate),
  notes: Schema.optionalKey(notes),
});

export const UpdateAccountPayload = Schema.Struct({
  name: Schema.optionalKey(accountName),
  type: Schema.optionalKey(accountType),
  institution: Schema.optionalKey(institution),
  currency: Schema.optionalKey(TrimmedCurrency),
  currentBalance: Schema.optionalKey(Money),
  availableBalance: Schema.optionalKey(Money),
  lockedBalance: Schema.optionalKey(NonNegativeMoney),
  creditLimit: Schema.optionalKey(PositiveMoney),
  openedAt: Schema.optionalKey(Schema.Date),
  maturesAt: Schema.optionalKey(Schema.Date),
  interestRate: Schema.optionalKey(interestRate),
  notes: Schema.optionalKey(notes),
  status: Schema.optionalKey(Schema.Literals(['active', 'closed', 'matured'])),
});

const description = TrimmedString.check(Schema.isBetweenLength(1, 160));

export const CreateTransactionPayload = Schema.Struct({
  type: Schema.Literals(['income', 'expense']),
  amount: PositiveMoney,
  currency: Currency,
  description,
  occurredAt: Schema.optionalKey(Schema.Date),
  categoryId: Schema.optionalKey(Id),
  accountId: Schema.optionalKey(Id),
  notes: Schema.optionalKey(notes),
  tags: Schema.optionalKey(shortTags),
});

export const UpdateTransactionPayload = Schema.Struct({
  description: Schema.optionalKey(description),
  amount: Schema.optionalKey(PositiveMoney),
  occurredAt: Schema.optionalKey(Schema.Date),
  categoryId: Schema.optionalKey(Schema.NullOr(Id)),
  accountId: Schema.optionalKey(Schema.NullOr(Id)),
  tags: Schema.optionalKey(shortTags),
});

const categoryType = Schema.Literals(['income', 'expense', 'both']);
const categoryName = TrimmedString.check(Schema.isBetweenLength(1, 80));
const icon = TrimmedString.check(Schema.isMaxLength(32));
const color = TrimmedString.check(Schema.isMaxLength(32));

export const CreateCategoryPayload = Schema.Struct({
  name: categoryName,
  type: categoryType,
  icon: Schema.optionalKey(icon),
  color: Schema.optionalKey(color),
});

export const UpdateCategoryPayload = Schema.Struct({
  name: Schema.optionalKey(categoryName),
  type: Schema.optionalKey(categoryType),
  icon: Schema.optionalKey(icon),
  color: Schema.optionalKey(color),
});

export const UpsertBudgetPayload = Schema.Struct({
  categoryId: Id,
  month: MonthKey,
  amount: NonNegativeMoney,
  currency: Currency,
});
