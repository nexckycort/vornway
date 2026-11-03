import type { InternalError } from '@vornway/contracts/errors';
import { InvalidFinanceAccount } from '@vornway/contracts/modules/finances/errors';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';

export class DebtAccounts extends Context.Service<
  DebtAccounts,
  {
    require(
      userId: string,
      accountId: string | null | undefined,
      currency: string,
    ): Effect.Effect<void, InvalidFinanceAccount | InternalError>;
  }
>()('@vornway/api/modules/debts/accounts/DebtAccounts') {
  static readonly layer = Layer.effect(
    DebtAccounts,
    Effect.gen(function* () {
      const database = yield* Database;

      const require = Effect.fn('DebtAccounts.require')(function* (
        userId: string,
        accountId: string | null | undefined,
        currency: string,
      ) {
        if (!accountId) return;
        const account = yield* database.use((db) =>
          db.financeAccount.findFirst({
            where: {
              id: accountId,
              ownerId: userId,
              currency,
              archivedAt: null,
              status: { not: 'CLOSED' },
            },
            select: { id: true },
          }),
        );
        if (!account) return yield* new InvalidFinanceAccount();
      });

      return DebtAccounts.of({ require });
    }),
  );
}
