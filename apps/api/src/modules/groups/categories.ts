import type { InternalError } from '@vornway/contracts/errors';
import {
  GroupCategoryHasExpenses,
  GroupCategoryNameConflict,
  GroupCategoryNameRequired,
  GroupCategoryNotFound,
  GroupCategoryTargetNotFound,
  GroupCategoryTargetSame,
  GroupNotFound,
} from '@vornway/contracts/modules/groups/errors';
import type {
  CreateCategoryPayload,
  DeletedCategory,
  GroupCategory,
  MoveCategoryExpensesPayload,
  MovedCategoryExpenses,
  UpdateCategoryPayload,
} from '@vornway/contracts/modules/groups/schemas';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { required, visibleGroup } from './helpers';

const categorySelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
} as const;

export class GroupCategories extends Context.Service<
  GroupCategories,
  {
    create(
      userId: string,
      groupId: string,
      payload: typeof CreateCategoryPayload.Type,
    ): Effect.Effect<
      typeof GroupCategory.Type,
      GroupNotFound | GroupCategoryNameRequired | InternalError
    >;
    update(
      userId: string,
      groupId: string,
      categoryId: string,
      payload: typeof UpdateCategoryPayload.Type,
    ): Effect.Effect<
      typeof GroupCategory.Type,
      | GroupNotFound
      | GroupCategoryNotFound
      | GroupCategoryNameRequired
      | GroupCategoryNameConflict
      | InternalError
    >;
    remove(
      userId: string,
      groupId: string,
      categoryId: string,
    ): Effect.Effect<
      typeof DeletedCategory.Type,
      | GroupNotFound
      | GroupCategoryNotFound
      | GroupCategoryHasExpenses
      | InternalError
    >;
    moveExpenses(
      userId: string,
      groupId: string,
      categoryId: string,
      payload: typeof MoveCategoryExpensesPayload.Type,
    ): Effect.Effect<
      typeof MovedCategoryExpenses.Type,
      | GroupNotFound
      | GroupCategoryNotFound
      | GroupCategoryTargetSame
      | GroupCategoryTargetNotFound
      | InternalError
    >;
  }
>()('vornway/groups/GroupCategories') {
  static readonly layer = Layer.effect(
    GroupCategories,
    Effect.gen(function* () {
      const database = yield* Database;

      const requireGroup = (userId: string, groupId: string) =>
        database
          .use((db) =>
            db.group.findFirst({
              where: visibleGroup(userId, groupId),
              select: { id: true },
            }),
          )
          .pipe(required(() => new GroupNotFound()));

      const requireCategory = (groupId: string, categoryId: string) =>
        database
          .use((db) =>
            db.expenseCategory.findFirst({
              where: { id: categoryId, groupId },
              select: { id: true },
            }),
          )
          .pipe(required(() => new GroupCategoryNotFound()));

      const create = Effect.fn('GroupCategories.create')(function* (
        userId: string,
        groupId: string,
        payload: typeof CreateCategoryPayload.Type,
      ) {
        yield* requireGroup(userId, groupId);
        const name = payload.name.trim();
        if (!name) return yield* new GroupCategoryNameRequired();

        const existing = yield* database.use((db) =>
          db.expenseCategory.findFirst({
            where: { groupId, name: { equals: name, mode: 'insensitive' } },
            select: categorySelect,
          }),
        );
        if (existing) return existing;
        return yield* database.use((db) =>
          db.expenseCategory.create({
            data: {
              groupId,
              name,
              icon: payload.icon?.trim() || null,
              color: payload.color?.trim() || null,
            },
            select: categorySelect,
          }),
        );
      });

      const update = Effect.fn('GroupCategories.update')(function* (
        userId: string,
        groupId: string,
        categoryId: string,
        payload: typeof UpdateCategoryPayload.Type,
      ) {
        yield* requireGroup(userId, groupId);
        yield* requireCategory(groupId, categoryId);

        const name = payload.name?.trim();
        if (name === '') return yield* new GroupCategoryNameRequired();
        if (name !== undefined) {
          const duplicated = yield* database.use((db) =>
            db.expenseCategory.findFirst({
              where: {
                groupId,
                id: { not: categoryId },
                name: { equals: name, mode: 'insensitive' },
              },
              select: { id: true },
            }),
          );
          if (duplicated) return yield* new GroupCategoryNameConflict();
        }

        return yield* database.use((db) =>
          db.expenseCategory.update({
            where: { id: categoryId },
            data: {
              ...(name === undefined ? {} : { name }),
              ...(payload.icon === undefined
                ? {}
                : { icon: payload.icon?.trim() || null }),
              ...(payload.color === undefined
                ? {}
                : { color: payload.color?.trim() || null }),
            },
            select: categorySelect,
          }),
        );
      });

      const remove = Effect.fn('GroupCategories.remove')(function* (
        userId: string,
        groupId: string,
        categoryId: string,
      ) {
        yield* requireGroup(userId, groupId);
        yield* requireCategory(groupId, categoryId);
        const related = yield* database.use((db) =>
          db.expense.count({ where: { categoryId, groupId } }),
        );
        if (related > 0) return yield* new GroupCategoryHasExpenses();
        yield* database.use((db) =>
          db.expenseCategory.delete({ where: { id: categoryId } }),
        );
        return { id: categoryId };
      });

      const moveExpenses = Effect.fn('GroupCategories.moveExpenses')(function* (
        userId: string,
        groupId: string,
        categoryId: string,
        payload: typeof MoveCategoryExpensesPayload.Type,
      ) {
        yield* requireGroup(userId, groupId);
        yield* requireCategory(groupId, categoryId);
        const targetCategoryId = payload.targetCategoryId ?? null;
        if (targetCategoryId === categoryId) {
          return yield* new GroupCategoryTargetSame();
        }
        if (targetCategoryId) {
          yield* database
            .use((db) =>
              db.expenseCategory.findFirst({
                where: { id: targetCategoryId, groupId },
                select: { id: true },
              }),
            )
            .pipe(required(() => new GroupCategoryTargetNotFound()));
        }
        const moved = yield* database.use((db) =>
          db.expense.updateMany({
            where: { groupId, categoryId },
            data: { categoryId: targetCategoryId },
          }),
        );
        return {
          categoryId,
          targetCategoryId,
          movedExpenseCount: moved.count,
        };
      });

      return GroupCategories.of({ create, update, remove, moveExpenses });
    }),
  );
}
