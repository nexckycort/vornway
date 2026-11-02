import { Effect, Schema } from 'effect';
import { literalsWithFallback, TrimmedString } from '../../schema.ts';

const nullableString = Schema.NullOr(Schema.String);
const Id = Schema.String.check(Schema.isMinLength(1));
const PositiveMoney = Schema.Finite.check(Schema.isGreaterThan(0));
const direction = Schema.Literals(['lent', 'borrowed']);
const interestType = Schema.Literals(['none', 'percentage', 'fixed']);
const Currency = TrimmedString.check(Schema.isBetweenLength(3, 3));
const note = TrimmedString.check(Schema.isMaxLength(400));

const AccountRef = Schema.NullOr(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    institution: nullableString,
    currency: Schema.String,
  }),
);

const DebtPayment = Schema.Struct({
  id: Schema.String,
  debtId: Schema.String,
  accountId: nullableString,
  amount: Schema.Number,
  paidAt: Schema.Date,
  note: nullableString,
  createdAt: Schema.Date,
  account: AccountRef,
});

const DebtAmount = Schema.Struct({
  id: Schema.String,
  account: AccountRef,
  amount: Schema.Number,
  loanDate: Schema.Date,
  createdAt: Schema.Date,
});

export const Debt = Schema.Struct({
  id: Schema.String,
  ownerId: Schema.String,
  name: Schema.String,
  counterpartyId: nullableString,
  counterpartyName: Schema.String,
  direction: Schema.String,
  principalAmount: Schema.Number,
  interestType: Schema.String,
  interestValue: Schema.NullOr(Schema.Number),
  expectedTotal: Schema.Number,
  currency: Schema.String,
  dueDate: Schema.NullOr(Schema.Date),
  description: nullableString,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  viewerRole: literalsWithFallback(['owner', 'counterparty'], 'unknown'),
  paidAmount: Schema.Number,
  remainingAmount: Schema.Number,
  status: literalsWithFallback(['paid', 'overdue', 'active'], 'unknown'),
  payments: Schema.Array(DebtPayment),
  amounts: Schema.Array(DebtAmount),
});

export const DeletedDebt = Schema.Struct({ deleted: Schema.Literal(true) });

export const DebtParams = Schema.Struct({ id: Id });
export const DebtAmountParams = Schema.Struct({ id: Id, amountId: Id });
export const DebtPaymentParams = Schema.Struct({ id: Id, paymentId: Id });

export const DebtListQuery = Schema.Struct({
  status: Schema.Literals(['active', 'paid', 'overdue', 'all']).pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed('active')),
  ),
  search: Schema.optionalKey(TrimmedString.check(Schema.isMaxLength(120))),
});

export const DebtAmountPayload = Schema.Struct({
  amount: PositiveMoney,
  accountId: Schema.optionalKey(Id),
  loanDate: Schema.Date,
});

export const UpdateDebtAmountPayload = Schema.Struct({
  amount: Schema.optionalKey(PositiveMoney),
  accountId: Schema.optionalKey(Id),
  loanDate: Schema.optionalKey(Schema.Date),
});

const name = TrimmedString.check(Schema.isBetweenLength(1, 120));
const description = TrimmedString.check(Schema.isMaxLength(400));

export const CreateDebtPayload = Schema.Struct({
  name,
  counterpartyName: name,
  counterpartyId: Schema.optionalKey(Id),
  direction,
  principalAmount: PositiveMoney,
  amounts: Schema.optionalKey(
    Schema.Array(DebtAmountPayload).check(Schema.isMinLength(1)),
  ),
  interestType: interestType.pipe(
    Schema.withDecodingDefaultTypeKey(Effect.succeed('none')),
  ),
  interestValue: Schema.optionalKey(
    Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0)),
  ),
  currency: Currency,
  dueDate: Schema.optionalKey(Schema.NullOr(Schema.Date)),
  description: Schema.optionalKey(description),
});

export const UpdateDebtPayload = Schema.Struct({
  name: Schema.optionalKey(name),
  counterpartyName: Schema.optionalKey(name),
  counterpartyId: Schema.optionalKey(Schema.NullOr(Id)),
  direction: Schema.optionalKey(direction),
  principalAmount: Schema.optionalKey(PositiveMoney),
  amounts: CreateDebtPayload.fields.amounts,
  interestType: Schema.optionalKey(interestType),
  interestValue: CreateDebtPayload.fields.interestValue,
  currency: Schema.optionalKey(Currency),
  dueDate: CreateDebtPayload.fields.dueDate,
  description: Schema.optionalKey(description),
});

export const CreatePaymentPayload = Schema.Struct({
  amount: PositiveMoney,
  accountId: Schema.optionalKey(Id),
  paidAt: Schema.optionalKey(Schema.Date),
  note: Schema.optionalKey(note),
});

export const UpdatePaymentPayload = Schema.Struct({
  amount: Schema.optionalKey(PositiveMoney),
  accountId: Schema.optionalKey(Schema.NullOr(Id)),
  paidAt: Schema.optionalKey(Schema.Date),
  note: Schema.optionalKey(note),
});
