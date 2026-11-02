import type { InternalError } from '@vornway/contracts/errors';
import type { FinanceCategory } from '@vornway/contracts/modules/finances/entities';
import {
  FinanceCategoryNameTaken,
  FinanceCategoryNotFound,
} from '@vornway/contracts/modules/finances/errors';
import type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@vornway/contracts/modules/finances/inputs';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { FinanceDefaults } from './defaults';

type Category = typeof FinanceCategory.Type;

export class FinanceCategories extends Context.Service<
  FinanceCategories,
  {
    create(
      userId: string,
      input: typeof CreateCategoryPayload.Type,
    ): Effect.Effect<Category, InternalError>;
    update(
      userId: string,
      categoryId: string,
      input: typeof UpdateCategoryPayload.Type,
    ): Effect.Effect<
      Category,
      FinanceCategoryNotFound | FinanceCategoryNameTaken | InternalError
    >;
    delete(
      userId: string,
      categoryId: string,
    ): Effect.Effect<void, FinanceCategoryNotFound | InternalError>;
  }
>()('vornway/finances/FinanceCategories') {
  static readonly layer = Layer.effect(
    FinanceCategories,
    Effect.gen(function* () {
      const database = yield* Database;
      const defaults = yield* FinanceDefaults;

      const findActive = (userId: string, categoryId: string) =>
        database.use((db) =>
          db.financeCategory.findFirst({
            where: { id: categoryId, ownerId: userId, archivedAt: null },
          }),
        );

      const create = Effect.fn('FinanceCategories.create')(function* (
        userId: string,
        input: typeof CreateCategoryPayload.Type,
      ) {
        yield* defaults.ensure(userId, 'COP');
        const transactionType = toTransactionType(input.type);
        const existing = yield* database.use((db) =>
          db.financeCategory.findFirst({
            where: {
              ownerId: userId,
              name: { equals: input.name, mode: 'insensitive' },
              archivedAt: null,
            },
          }),
        );

        if (existing) {
          if (
            existing.transactionType !== 'BOTH' &&
            existing.transactionType !== transactionType
          ) {
            return yield* database.use((db) =>
              db.financeCategory.update({
                where: { id: existing.id },
                data: { transactionType: 'BOTH' },
              }),
            );
          }
          return existing;
        }

        return yield* database.use((db) =>
          db.financeCategory.create({
            data: {
              ownerId: userId,
              name: input.name,
              transactionType,
              icon: input.icon ?? (input.type === 'income' ? 'plus' : 'tag'),
              color: input.color ?? defaultColor(input.type),
            },
          }),
        );
      });

      const update = Effect.fn('FinanceCategories.update')(function* (
        userId: string,
        categoryId: string,
        input: typeof UpdateCategoryPayload.Type,
      ) {
        const category = yield* findActive(userId, categoryId);
        if (!category) return yield* new FinanceCategoryNotFound();

        if (input.name) {
          const duplicate = yield* database.use((db) =>
            db.financeCategory.findFirst({
              where: {
                ownerId: userId,
                archivedAt: null,
                name: { equals: input.name, mode: 'insensitive' },
                id: { not: categoryId },
              },
              select: { id: true },
            }),
          );
          if (duplicate) return yield* new FinanceCategoryNameTaken();
        }

        return yield* database.use((db) =>
          db.financeCategory.update({
            where: { id: categoryId },
            data: {
              ...(input.name ? { name: input.name } : {}),
              ...(input.type
                ? { transactionType: toTransactionType(input.type) }
                : {}),
              ...(input.icon === undefined ? {} : { icon: input.icon }),
              ...(input.color === undefined ? {} : { color: input.color }),
            },
          }),
        );
      });

      const remove = Effect.fn('FinanceCategories.delete')(function* (
        userId: string,
        categoryId: string,
      ) {
        const category = yield* findActive(userId, categoryId);
        if (!category) return yield* new FinanceCategoryNotFound();
        yield* database.use((db) =>
          db.financeCategory.update({
            where: { id: categoryId },
            data: { archivedAt: new Date() },
          }),
        );
      });

      return FinanceCategories.of({ create, update, delete: remove });
    }),
  );
}

const toTransactionType = (type: 'income' | 'expense' | 'both') =>
  type === 'income' ? 'INCOME' : type === 'expense' ? 'EXPENSE' : 'BOTH';

const defaultColor = (type: 'income' | 'expense' | 'both') =>
  type === 'income' ? '#059669' : type === 'expense' ? '#334155' : '#4f46e5';
