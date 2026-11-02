import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { SessionAuth } from '../auth/contract.ts';
import { InvalidFinanceAccount } from '../finances/errors.ts';
import {
  DebtAmountNotFound,
  DebtAmountRequired,
  DebtAssignedToSelf,
  DebtCounterpartyNotFound,
  DebtNotFound,
  DebtPaymentExceedsBalance,
  DebtPaymentNotFound,
} from './errors.ts';
import {
  CreateDebtPayload,
  CreatePaymentPayload,
  Debt,
  DebtAmountParams,
  DebtAmountPayload,
  DebtListQuery,
  DebtParams,
  DebtPaymentParams,
  DeletedDebt,
  UpdateDebtAmountPayload,
  UpdateDebtPayload,
  UpdatePaymentPayload,
} from './schemas.ts';

const created = HttpApiSchema.status(201);

export class DebtsApi extends HttpApiGroup.make('debts')
  .add(
    HttpApiEndpoint.get('list', '/api/debts', {
      query: DebtListQuery,
      success: Schema.Array(Debt),
    }),
  )
  .add(
    HttpApiEndpoint.post('create', '/api/debts', {
      payload: CreateDebtPayload,
      success: Debt.pipe(created),
      error: [
        DebtAssignedToSelf,
        DebtCounterpartyNotFound,
        InvalidFinanceAccount,
      ],
    }),
  )
  .add(
    HttpApiEndpoint.get('get', '/api/debts/:id', {
      params: DebtParams,
      success: Debt,
      error: DebtNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.patch('update', '/api/debts/:id', {
      params: DebtParams,
      payload: UpdateDebtPayload,
      success: Debt,
      error: [DebtNotFound, DebtAssignedToSelf, DebtCounterpartyNotFound],
    }),
  )
  .add(
    HttpApiEndpoint.delete('delete', '/api/debts/:id', {
      params: DebtParams,
      success: DeletedDebt,
      error: DebtNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.post('addAmount', '/api/debts/:id/amounts', {
      params: DebtParams,
      payload: DebtAmountPayload,
      success: Debt.pipe(created),
      error: [DebtNotFound, InvalidFinanceAccount],
    }),
  )
  .add(
    HttpApiEndpoint.patch('updateAmount', '/api/debts/:id/amounts/:amountId', {
      params: DebtAmountParams,
      payload: UpdateDebtAmountPayload,
      success: Debt,
      error: [DebtNotFound, DebtAmountNotFound, InvalidFinanceAccount],
    }),
  )
  .add(
    HttpApiEndpoint.delete('deleteAmount', '/api/debts/:id/amounts/:amountId', {
      params: DebtAmountParams,
      success: Debt,
      error: [DebtNotFound, DebtAmountNotFound, DebtAmountRequired],
    }),
  )
  .add(
    HttpApiEndpoint.post('payment', '/api/debts/:id/payments', {
      params: DebtParams,
      payload: CreatePaymentPayload,
      success: Debt.pipe(created),
      error: [DebtNotFound, InvalidFinanceAccount, DebtPaymentExceedsBalance],
    }),
  )
  .add(
    HttpApiEndpoint.patch(
      'updatePayment',
      '/api/debts/:id/payments/:paymentId',
      {
        params: DebtPaymentParams,
        payload: UpdatePaymentPayload,
        success: Debt,
        error: [
          DebtNotFound,
          DebtPaymentNotFound,
          InvalidFinanceAccount,
          DebtPaymentExceedsBalance,
        ],
      },
    ),
  )
  .add(
    HttpApiEndpoint.delete(
      'deletePayment',
      '/api/debts/:id/payments/:paymentId',
      {
        params: DebtPaymentParams,
        success: Debt,
        error: [DebtNotFound, DebtPaymentNotFound],
      },
    ),
  )
  .middleware(SessionAuth) {}
