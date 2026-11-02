import { Effect, Schema } from 'effect';

export const defaulted = (value: string) =>
  Schema.String.pipe(Schema.withConstructorDefault(Effect.succeed(value)));

export const coded = <const C extends string>(code: C, message: string) => ({
  code: Schema.Literal(code).pipe(
    Schema.withConstructorDefault(Effect.succeed(code)),
  ),
  message: defaulted(message),
});

export class FinanceAccountNotFound extends Schema.TaggedError<FinanceAccountNotFound>()(
  'FinanceAccountNotFound',
  { error: defaulted('Finance account not found') },
  { httpApiStatus: 404 },
) {}
export class FinanceTransactionNotFound extends Schema.TaggedError<FinanceTransactionNotFound>()(
  'FinanceTransactionNotFound',
  { error: defaulted('Finance transaction not found') },
  { httpApiStatus: 404 },
) {}
export class FinanceCategoryNotFound extends Schema.TaggedError<FinanceCategoryNotFound>()(
  'FinanceCategoryNotFound',
  { error: defaulted('Finance category not found') },
  { httpApiStatus: 404 },
) {}
export class InvalidFinanceCategory extends Schema.TaggedError<InvalidFinanceCategory>()(
  'InvalidFinanceCategory',
  coded('INVALID_FINANCE_CATEGORY', 'Invalid finance category'),
  { httpApiStatus: 400 },
) {}
export class InvalidFinanceAccount extends Schema.TaggedError<InvalidFinanceAccount>()(
  'InvalidFinanceAccount',
  coded('INVALID_FINANCE_ACCOUNT', 'Invalid finance account'),
  { httpApiStatus: 400 },
) {}
export class CreditCardLimitRequired extends Schema.TaggedError<CreditCardLimitRequired>()(
  'CreditCardLimitRequired',
  coded('CREDIT_CARD_LIMIT_REQUIRED', 'Credit card limit is required'),
  { httpApiStatus: 400 },
) {}
export class FinanceCategoryNameTaken extends Schema.TaggedError<FinanceCategoryNameTaken>()(
  'FinanceCategoryNameTaken',
  coded(
    'FINANCE_CATEGORY_NAME_TAKEN',
    'A finance category with this name already exists',
  ),
  { httpApiStatus: 409 },
) {}
