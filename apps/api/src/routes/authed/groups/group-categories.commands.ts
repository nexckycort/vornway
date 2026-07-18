import { db } from '#/infrastructure/database/connection';
import { groupErrors } from './groups.errors';
import { buildGroupAccessWhere } from './helpers';
import type {
  CreateGroupCategoryInput,
  CreateGroupCategoryResult,
  DeleteGroupCategoryInput,
  DeleteGroupCategoryResult,
  MoveGroupCategoryExpensesInput,
  MoveGroupCategoryExpensesResult,
  UpdateGroupCategoryInput,
  UpdateGroupCategoryResult,
} from './types';

export function createGroupCategoriesOperations() {
  return {
    createCategory: async ({
      userId,
      groupId,
      name,
      icon,
      color,
    }: CreateGroupCategoryInput): Promise<CreateGroupCategoryResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const normalizedName = name.trim();
      const normalizedIcon = icon?.trim() || null;
      const normalizedColor = color?.trim() || null;

      if (!normalizedName) {
        throw groupErrors.categoryNameRequired();
      }

      const existing = await db.expenseCategory.findFirst({
        where: {
          groupId,
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
        select: { id: true, name: true, icon: true, color: true },
      });

      if (existing) {
        return existing;
      }

      const category = await db.expenseCategory.create({
        data: {
          groupId,
          name: normalizedName,
          icon: normalizedIcon,
          color: normalizedColor,
        },
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      });

      return category;
    },
    updateCategory: async ({
      userId,
      groupId,
      categoryId,
      name,
      icon,
      color,
    }: UpdateGroupCategoryInput): Promise<UpdateGroupCategoryResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const category = await db.expenseCategory.findFirst({
        where: {
          id: categoryId,
          groupId,
        },
        select: { id: true },
      });

      if (!category) {
        throw groupErrors.categoryNotFound();
      }

      const updates: {
        name?: string;
        icon?: string | null;
        color?: string | null;
      } = {};

      if (name !== undefined) {
        const normalizedName = name.trim();
        if (!normalizedName) {
          throw groupErrors.categoryNameRequired();
        }
        updates.name = normalizedName;
      }

      if (icon !== undefined) {
        updates.icon = icon?.trim() || null;
      }

      if (color !== undefined) {
        updates.color = color?.trim() || null;
      }

      const duplicatedName =
        updates.name !== undefined
          ? await db.expenseCategory.findFirst({
              where: {
                groupId,
                id: {
                  not: categoryId,
                },
                name: {
                  equals: updates.name,
                  mode: 'insensitive',
                },
              },
              select: { id: true },
            })
          : null;

      if (duplicatedName) {
        throw groupErrors.categoryNameConflict();
      }

      const updated = await db.expenseCategory.update({
        where: { id: categoryId },
        data: updates,
        select: {
          id: true,
          name: true,
          icon: true,
          color: true,
        },
      });

      return updated;
    },
    deleteCategory: async ({
      userId,
      groupId,
      categoryId,
    }: DeleteGroupCategoryInput): Promise<DeleteGroupCategoryResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const category = await db.expenseCategory.findFirst({
        where: {
          id: categoryId,
          groupId,
        },
        select: { id: true },
      });

      if (!category) {
        throw groupErrors.categoryNotFound();
      }

      const relatedExpenseCount = await db.expense.count({
        where: {
          categoryId,
          groupId,
        },
      });

      if (relatedExpenseCount > 0) {
        throw groupErrors.categoryHasExpenses();
      }

      await db.expenseCategory.delete({
        where: { id: categoryId },
      });

      return { id: categoryId };
    },
    moveCategoryExpenses: async ({
      userId,
      groupId,
      categoryId,
      targetCategoryId,
    }: MoveGroupCategoryExpensesInput): Promise<MoveGroupCategoryExpensesResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
        },
      });

      if (!group) {
        throw groupErrors.notFound();
      }

      const sourceCategory = await db.expenseCategory.findFirst({
        where: {
          id: categoryId,
          groupId,
        },
        select: { id: true },
      });

      if (!sourceCategory) {
        throw groupErrors.categoryNotFound();
      }

      if (targetCategoryId === categoryId) {
        throw groupErrors.categoryTargetSame();
      }

      if (targetCategoryId) {
        const targetCategory = await db.expenseCategory.findFirst({
          where: {
            id: targetCategoryId,
            groupId,
          },
          select: { id: true },
        });

        if (!targetCategory) {
          throw groupErrors.categoryTargetNotFound();
        }
      }

      const result = await db.expense.updateMany({
        where: {
          groupId,
          categoryId,
        },
        data: {
          categoryId: targetCategoryId ?? null,
        },
      });

      return {
        categoryId,
        targetCategoryId: targetCategoryId ?? null,
        movedExpenseCount: result.count,
      };
    },
  };
}
