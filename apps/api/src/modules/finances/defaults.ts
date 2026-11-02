import type { InternalError } from '@vornway/contracts/errors';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';

const EXPENSE_CATEGORIES = [
  { name: 'Arriendo', icon: 'home', color: '#2563eb' },
  { name: 'Comida', icon: 'utensils', color: '#16a34a' },
  { name: 'Salidas', icon: 'sparkles', color: '#db2777' },
  { name: 'Transporte', icon: 'car', color: '#f59e0b' },
  { name: 'Servicios', icon: 'bolt', color: '#7c3aed' },
  { name: 'Salud', icon: 'heart', color: '#dc2626' },
  { name: 'Otros', icon: 'dots', color: '#64748b' },
] as const;

const INCOME_CATEGORIES = [
  { name: 'Salario', icon: 'wallet', color: '#059669' },
  { name: 'Ingresos extra', icon: 'plus', color: '#0f766e' },
] as const;

export class FinanceDefaults extends Context.Service<
  FinanceDefaults,
  {
    ensure(
      userId: string,
      currency: string,
    ): Effect.Effect<void, InternalError>;
  }
>()('vornway/finances/FinanceDefaults') {
  static readonly layer = Layer.effect(
    FinanceDefaults,
    Effect.gen(function* () {
      const database = yield* Database;

      const ensure = Effect.fn('FinanceDefaults.ensure')(function* (
        userId: string,
        currency: string,
      ) {
        const [accountCount, categoryCount] = yield* Effect.all([
          database.use((db) =>
            db.financeAccount.count({ where: { ownerId: userId } }),
          ),
          database.use((db) =>
            db.financeCategory.count({ where: { ownerId: userId } }),
          ),
        ]);

        if (accountCount === 0) {
          yield* database.use((db) =>
            db.financeAccount.create({
              data: {
                ownerId: userId,
                name: 'Efectivo',
                accountType: 'CASH',
                currency,
                currentBalance: 0,
                availableBalance: 0,
                lockedBalance: 0,
              },
            }),
          );
        }

        if (categoryCount === 0) {
          yield* database.use((db) =>
            db.financeCategory.createMany({
              data: [
                ...INCOME_CATEGORIES.map((category) => ({
                  ownerId: userId,
                  transactionType: 'INCOME' as const,
                  isDefault: true,
                  ...category,
                })),
                ...EXPENSE_CATEGORIES.map((category) => ({
                  ownerId: userId,
                  transactionType: 'EXPENSE' as const,
                  isDefault: true,
                  ...category,
                })),
              ],
              skipDuplicates: true,
            }),
          );
        }
      });

      return FinanceDefaults.of({ ensure });
    }),
  );
}
