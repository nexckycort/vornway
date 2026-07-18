import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { createGroupCategoriesOperations } from './group-categories.commands';
import { groupRouteErrorResponse } from './groups.errors';
import {
  groupCategoryParamsSchema,
  groupCategorySchema,
  groupParamsSchema,
  moveGroupCategoryExpensesSchema,
  updateGroupCategorySchema,
} from './groups.validators';

const groupCategoryOperations = createGroupCategoriesOperations();

export const groupCategoriesRoutes = new Hono<AppContext>()
  .post(
    '/:id/categories',
    zValidator('param', groupParamsSchema),
    zValidator('json', groupCategorySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupCategoryOperations.createCategory({
          userId,
          groupId: id,
          name: data.name,
          icon: data.icon,
          color: data.color,
        });

        return c.json(result, 201);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .patch(
    '/:id/categories/:categoryId',
    zValidator('param', groupCategoryParamsSchema),
    zValidator('json', updateGroupCategorySchema),
    async (c) => {
      const { id, categoryId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupCategoryOperations.updateCategory({
          userId,
          groupId: id,
          categoryId,
          name: data.name,
          icon: data.icon,
          color: data.color,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .delete(
    '/:id/categories/:categoryId',
    zValidator('param', groupCategoryParamsSchema),
    async (c) => {
      const { id, categoryId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupCategoryOperations.deleteCategory({
          userId,
          groupId: id,
          categoryId,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .post(
    '/:id/categories/:categoryId/move-expenses',
    zValidator('param', groupCategoryParamsSchema),
    zValidator('json', moveGroupCategoryExpensesSchema),
    async (c) => {
      const { id, categoryId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupCategoryOperations.moveCategoryExpenses({
          userId,
          groupId: id,
          categoryId,
          targetCategoryId: data.targetCategoryId,
        });

        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  );
