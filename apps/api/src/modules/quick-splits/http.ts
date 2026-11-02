import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { QuickSplits } from './service';

export const QuickSplitsHandlers = HttpApiBuilder.group(
  Api,
  'quickSplits',
  (handlers) =>
    Effect.gen(function* () {
      const quickSplits = yield* QuickSplits;
      return handlers
        .handle('listExpenses', ({ query }) =>
          Effect.flatMap(CurrentUser, (user) =>
            quickSplits.listExpenses(user.id, query),
          ),
        )
        .handle('create', ({ payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            quickSplits.create(user.id, payload),
          ),
        )
        .handle('createExpense', ({ params, payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            quickSplits.createExpense(user.id, params.id, payload),
          ),
        )
        .handle('settleDebt', ({ params, payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            quickSplits.settleDebt(
              user.id,
              params.id,
              params.expenseId,
              payload,
            ),
          ),
        )
        .handle('updateExpense', ({ params, payload }) =>
          Effect.flatMap(CurrentUser, (user) =>
            quickSplits.updateExpense(
              user.id,
              params.id,
              params.expenseId,
              payload,
            ),
          ),
        )
        .handle('expenseDetail', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            quickSplits.expenseDetail(user.id, params.id, params.expenseId),
          ),
        )
        .handle('deleteExpense', ({ params }) =>
          Effect.flatMap(CurrentUser, (user) =>
            quickSplits.deleteExpense(user.id, params.id, params.expenseId),
          ),
        );
    }),
).pipe(Layer.provide(QuickSplits.layer));
