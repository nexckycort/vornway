/** biome-ignore-all lint/correctness/useHookAtTopLevel: useAppSession is a server helper */
import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod';

import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

const GetGroupCategoriesInputSchema = z.object({
  groupId: z.string(),
});

interface GetGroupCategoriesResponse {
  categories: Array<{
    id: string;
    name: string;
  }>;
}

export const getGroupCategories = createServerFn({ method: 'POST' })
  .inputValidator(GetGroupCategoriesInputSchema)
  .handler(async ({ data }): Promise<GetGroupCategoriesResponse> => {
    const session = await useAppSession();
    const userId = session.data.userId;

    if (!userId) {
      throw new Error('No autenticado');
    }

    const membership = await db.groupMember.findFirst({
      where: {
        groupId: data.groupId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new Error('No tienes acceso a este grupo');
    }

    const categories = await db.expenseCategory.findMany({
      where: {
        groupId: data.groupId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return { categories };
  });
