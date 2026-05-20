import { db } from '~/infrastructure/database/connection';
import { buildGroupAccessWhere } from './helpers';
import type {
  CreateGroupCategoryInput,
  CreateGroupCategoryResult,
} from './types';

export function createGroupCategoriesService() {
  return {
    createCategory: async ({
      userId,
      groupId,
      name,
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
          ownerId: true,
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      if (group.ownerId !== userId) {
        throw new Error('Solo el creador puede crear categorías');
      }

      const normalizedName = name.trim();

      if (!normalizedName) {
        throw new Error('El nombre de la categoría es obligatorio');
      }

      const existing = await db.expenseCategory.findFirst({
        where: {
          groupId,
          name: {
            equals: normalizedName,
            mode: 'insensitive',
          },
        },
        select: { id: true, name: true },
      });

      if (existing) {
        return existing;
      }

      const category = await db.expenseCategory.create({
        data: {
          groupId,
          name: normalizedName,
        },
        select: {
          id: true,
          name: true,
        },
      });

      return category;
    },
  };
}
