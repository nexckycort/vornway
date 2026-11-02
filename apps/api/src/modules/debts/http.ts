import { Api } from '@vornway/contracts/api';
import { CurrentUser } from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { DebtAccounts } from './accounts';
import { DebtAmounts } from './amounts';
import { DebtPayments } from './payments';
import { Debts } from './service';

export const DebtsHandlers = HttpApiBuilder.group(Api, 'debts', (handlers) =>
  Effect.gen(function* () {
    const debts = yield* Debts;
    const amounts = yield* DebtAmounts;
    const payments = yield* DebtPayments;

    return handlers
      .handle('list', ({ query }) =>
        Effect.flatMap(CurrentUser, (user) => debts.list(user.id, query)),
      )
      .handle('create', ({ payload }) =>
        Effect.flatMap(CurrentUser, (user) => debts.create(user.id, payload)),
      )
      .handle('get', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) => debts.get(user.id, params.id)),
      )
      .handle('update', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          debts.update(user.id, params.id, payload),
        ),
      )
      .handle('delete', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          debts.delete(user.id, params.id),
        ).pipe(Effect.as({ deleted: true as const })),
      )
      .handle('addAmount', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          amounts.add(user.id, params.id, payload),
        ),
      )
      .handle('updateAmount', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          amounts.update(user.id, params.id, params.amountId, payload),
        ),
      )
      .handle('deleteAmount', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          amounts.delete(user.id, params.id, params.amountId),
        ),
      )
      .handle('payment', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          payments.add(user.id, params.id, payload),
        ),
      )
      .handle('updatePayment', ({ params, payload }) =>
        Effect.flatMap(CurrentUser, (user) =>
          payments.update(user.id, params.id, params.paymentId, payload),
        ),
      )
      .handle('deletePayment', ({ params }) =>
        Effect.flatMap(CurrentUser, (user) =>
          payments.delete(user.id, params.id, params.paymentId),
        ),
      );
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(DebtAmounts.layer, DebtPayments.layer).pipe(
      Layer.provideMerge(Debts.layer),
      Layer.provide(DebtAccounts.layer),
    ),
  ),
);
