import type { InternalError } from '@vornway/contracts/errors';
import type { FinanceBudgetWithCategory } from '@vornway/contracts/modules/finances/entities';
import { InvalidFinanceCategory } from '@vornway/contracts/modules/finances/errors';
import type { UpsertBudgetPayload } from '@vornway/contracts/modules/finances/inputs';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { monthRange } from './calendar';
import { FinanceDefaults } from './defaults';
import { money } from './money';

export class FinanceBudgets extends Context.Service<
  FinanceBudgets,
  {
    upsert(
      userId: string,
      input: typeof UpsertBudgetPayload.Type,
    ): Effect.Effect<
      typeof FinanceBudgetWithCategory.Type,
      InvalidFinanceCategory | InternalError
    >;
  }
>()('vornway/finances/FinanceBudgets') {
  static readonly layer = Layer.effect(
    FinanceBudgets,
    Effect.gen(function* () {
      const database = yield* Database;
      const defaults = yield* FinanceDefaults;

      const upsert = Effect.fn('FinanceBudgets.upsert')(function* (
        userId: string,
        input: typeof UpsertBudgetPayload.Type,
      ) {
        yield* defaults.ensure(userId, input.currency);
        const category = yield* database.use((db) =>
          db.financeCategory.findFirst({
            where: {
              id: input.categoryId,
              ownerId: userId,
              OR: [{ transactionType: 'EXPENSE' }, { transactionType: 'BOTH' }],
            },
            select: { id: true },
          }),
        );
        if (!category) return yield* new InvalidFinanceCategory();

        const month = monthRange(input.month).budgetMonth;
        const amount = money(input.amount);
        return yield* database.use((db) =>
          db.financeBudget.upsert({
            where: {
              ownerId_categoryId_month_currency: {
                ownerId: userId,
                categoryId: input.categoryId,
                month,
                currency: input.currency,
              },
            },
            create: {
              ownerId: userId,
              categoryId: input.categoryId,
              month,
              amount,
              currency: input.currency,
            },
            update: { amount },
            include: { category: true },
          }),
        );
      });

      return FinanceBudgets.of({ upsert });
    }),
  );
}
