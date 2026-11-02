import { Schema } from 'effect';
import { coded, defaulted } from '../finances/errors.ts';

export class DebtNotFound extends Schema.TaggedError<DebtNotFound>()(
  'DebtNotFound',
  { error: defaulted('Debt not found') },
  { httpApiStatus: 404 },
) {}
export class DebtAmountNotFound extends Schema.TaggedError<DebtAmountNotFound>()(
  'DebtAmountNotFound',
  { error: defaulted('Debt amount not found') },
  { httpApiStatus: 404 },
) {}
export class DebtPaymentNotFound extends Schema.TaggedError<DebtPaymentNotFound>()(
  'DebtPaymentNotFound',
  { error: defaulted('Payment not found') },
  { httpApiStatus: 404 },
) {}
export class DebtAssignedToSelf extends Schema.TaggedError<DebtAssignedToSelf>()(
  'DebtAssignedToSelf',
  coded('DEBT_ASSIGNED_TO_SELF', 'A debt cannot be assigned to yourself'),
  { httpApiStatus: 400 },
) {}
export class DebtCounterpartyNotFound extends Schema.TaggedError<DebtCounterpartyNotFound>()(
  'DebtCounterpartyNotFound',
  coded('DEBT_COUNTERPARTY_NOT_FOUND', 'Counterparty not found'),
  { httpApiStatus: 404 },
) {}
export class DebtPaymentExceedsBalance extends Schema.TaggedError<DebtPaymentExceedsBalance>()(
  'DebtPaymentExceedsBalance',
  coded('DEBT_PAYMENT_EXCEEDS_BALANCE', 'Payment exceeds remaining balance'),
  { httpApiStatus: 400 },
) {}
export class DebtAmountRequired extends Schema.TaggedError<DebtAmountRequired>()(
  'DebtAmountRequired',
  coded('DEBT_AMOUNT_REQUIRED', 'A debt must keep at least one loan amount'),
  { httpApiStatus: 400 },
) {}
