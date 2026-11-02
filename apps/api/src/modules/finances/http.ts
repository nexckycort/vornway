import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { FinanceAccounts } from './accounts';
import { FinanceBudgets } from './budgets';
import { FinanceCategories } from './categories';
import { FinanceDefaults } from './defaults';
import { FinanceMovements } from './movements';
import { FinanceOverview } from './summary';
import { FinanceTransactions } from './transactions';

const deleted = Effect.as({ ok: true as const });

export const FinancesHandlers = HttpApiBuilder.group(
  Api,
  'finances',
  (handlers) =>
    Effect.gen(function* () {
      const accounts = yield* FinanceAccounts;
      const budgets = yield* FinanceBudgets;
      const categories = yield* FinanceCategories;
      const movements = yield* FinanceMovements;
      const overview = yield* FinanceOverview;
      const transactions = yield* FinanceTransactions;

      return handlers
        .handle('summary', ({ query }) =>
          Effect.flatMap(CurrentUser, (user) =>
            overview.summary(user.id, query),
          ),
        )
        .handle('recentTransactions', ({ query }) =>
          Effect.flatMap(CurrentUser, (user) =>
            transactions.recent(user.id, query.limit),
          ),
        )
        .handle('movements', ({ query }) =>
          Effect.flatMap(CurrentUser, (user) => movements.list(user.id, query)),
        )
        .handle('accounts', ({ query }) =>
          Effect.flatMap(CurrentUser, (user) => accounts.list(user.id, query)),
        )
        .handle('account', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            accounts.get(user.id, params.id),
          ),
        )
        .handle('accountMovements', ({ params, query }) =>
          Effect.flatMap(CurrentUser, (user) =>
            accounts.listMovements(user.id, params.id, query),
          ),
        )
        .handle('createAccount', ({ payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            accounts.create(user.id, payload),
          ),
        )
        .handle('updateAccount', ({ params, payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            accounts.update(user.id, params.id, payload),
          ),
        )
        .handle('closeAccount', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            accounts.close(user.id, params.id),
          ),
        )
        .handle('deleteAccount', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            accounts.delete(user.id, params.id),
          ).pipe(deleted),
        )
        .handle('createTransaction', ({ payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            transactions.create(user.id, payload),
          ),
        )
        .handle('transaction', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            transactions.get(user.id, params.id),
          ),
        )
        .handle('updateTransaction', ({ params, payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            transactions.update(user.id, params.id, payload),
          ),
        )
        .handle('deleteTransaction', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            transactions.delete(user.id, params.id),
          ).pipe(deleted),
        )
        .handle('createCategory', ({ payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            categories.create(user.id, payload),
          ),
        )
        .handle('updateCategory', ({ params, payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            categories.update(user.id, params.id, payload),
          ),
        )
        .handle('deleteCategory', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            categories.delete(user.id, params.id),
          ).pipe(deleted),
        )
        .handle('upsertBudget', ({ payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            budgets.upsert(user.id, payload),
          ),
        );
    }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      FinanceAccounts.layer,
      FinanceBudgets.layer,
      FinanceCategories.layer,
      FinanceMovements.layer,
      FinanceOverview.layer,
      FinanceTransactions.layer,
    ).pipe(Layer.provide(FinanceDefaults.layer)),
  ),
);
