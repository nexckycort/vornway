import { Schema } from 'effect';
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { PageQuery } from '../../schema.ts';
import { SessionAuth } from '../auth/contract.ts';
import {
  FinanceAccount,
  FinanceAccountPage,
  FinanceBudgetWithCategory,
  FinanceCategory,
  FinanceDeleted,
  FinanceTransaction,
  FinanceTransactionWithTagLinks,
} from './entities.ts';
import {
  CreditCardLimitRequired,
  FinanceAccountNotFound,
  FinanceCategoryNameTaken,
  FinanceCategoryNotFound,
  FinanceTransactionNotFound,
  InvalidFinanceAccount,
  InvalidFinanceCategory,
} from './errors.ts';
import {
  AccountMovementListQuery,
  CreateAccountPayload,
  CreateCategoryPayload,
  CreateTransactionPayload,
  IdParams,
  MovementListQuery,
  SummaryQuery,
  TransactionListQuery,
  UpdateAccountPayload,
  UpdateCategoryPayload,
  UpdateTransactionPayload,
  UpsertBudgetPayload,
} from './inputs.ts';
import { AccountMovementPage, FinanceMovementPage } from './movements.ts';
import { FinanceSummary } from './summary.ts';

const created = HttpApiSchema.status(201);

export class FinancesApi extends HttpApiGroup.make('finances')
  .add(
    HttpApiEndpoint.get('summary', '/api/finances/summary', {
      query: SummaryQuery,
      success: FinanceSummary,
    }),
  )
  .add(
    HttpApiEndpoint.get('recentTransactions', '/api/finances/transactions', {
      query: TransactionListQuery,
      success: Schema.Array(FinanceTransaction),
    }),
  )
  .add(
    HttpApiEndpoint.get('movements', '/api/finances/movements', {
      query: MovementListQuery,
      success: FinanceMovementPage,
    }),
  )
  .add(
    HttpApiEndpoint.get('accounts', '/api/finances/accounts', {
      query: PageQuery,
      success: FinanceAccountPage,
    }),
  )
  .add(
    HttpApiEndpoint.get('account', '/api/finances/accounts/:id', {
      params: IdParams,
      success: FinanceAccount,
      error: FinanceAccountNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.get(
      'accountMovements',
      '/api/finances/accounts/:id/movements',
      {
        params: IdParams,
        query: AccountMovementListQuery,
        success: AccountMovementPage,
        error: FinanceAccountNotFound,
      },
    ),
  )
  .add(
    HttpApiEndpoint.post('createAccount', '/api/finances/accounts', {
      payload: CreateAccountPayload,
      success: FinanceAccount.pipe(created),
      error: CreditCardLimitRequired,
    }),
  )
  .add(
    HttpApiEndpoint.patch('updateAccount', '/api/finances/accounts/:id', {
      params: IdParams,
      payload: UpdateAccountPayload,
      success: FinanceAccount,
      error: [FinanceAccountNotFound, CreditCardLimitRequired],
    }),
  )
  .add(
    HttpApiEndpoint.post('closeAccount', '/api/finances/accounts/:id/close', {
      params: IdParams,
      success: FinanceAccount,
      error: FinanceAccountNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.delete('deleteAccount', '/api/finances/accounts/:id', {
      params: IdParams,
      success: FinanceDeleted,
      error: FinanceAccountNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.post('createTransaction', '/api/finances/transactions', {
      payload: CreateTransactionPayload,
      success: FinanceTransactionWithTagLinks.pipe(created),
      error: [InvalidFinanceCategory, InvalidFinanceAccount],
    }),
  )
  .add(
    HttpApiEndpoint.get('transaction', '/api/finances/transactions/:id', {
      params: IdParams,
      success: FinanceTransaction,
      error: FinanceTransactionNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.patch(
      'updateTransaction',
      '/api/finances/transactions/:id',
      {
        params: IdParams,
        payload: UpdateTransactionPayload,
        success: FinanceTransactionWithTagLinks,
        error: [
          FinanceTransactionNotFound,
          InvalidFinanceCategory,
          InvalidFinanceAccount,
        ],
      },
    ),
  )
  .add(
    HttpApiEndpoint.delete(
      'deleteTransaction',
      '/api/finances/transactions/:id',
      {
        params: IdParams,
        success: FinanceDeleted,
        error: FinanceTransactionNotFound,
      },
    ),
  )
  .add(
    HttpApiEndpoint.post('createCategory', '/api/finances/categories', {
      payload: CreateCategoryPayload,
      success: FinanceCategory.pipe(created),
    }),
  )
  .add(
    HttpApiEndpoint.patch('updateCategory', '/api/finances/categories/:id', {
      params: IdParams,
      payload: UpdateCategoryPayload,
      success: FinanceCategory,
      error: [FinanceCategoryNotFound, FinanceCategoryNameTaken],
    }),
  )
  .add(
    HttpApiEndpoint.delete('deleteCategory', '/api/finances/categories/:id', {
      params: IdParams,
      success: FinanceDeleted,
      error: FinanceCategoryNotFound,
    }),
  )
  .add(
    HttpApiEndpoint.post('upsertBudget', '/api/finances/budgets', {
      payload: UpsertBudgetPayload,
      success: FinanceBudgetWithCategory.pipe(created),
      error: InvalidFinanceCategory,
    }),
  )
  .middleware(SessionAuth) {}
