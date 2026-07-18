import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '#/shared/types/app';
import { createGroupExpensesHealth } from './group-expenses.operations';
import {
  groupRouteBadRequestErrorResponse,
  groupRouteErrorResponse,
} from './groups.errors';
import {
  createGroupExpenseSchema,
  groupExpenseParamsSchema,
  groupMemberParamsSchema,
  groupParamsSchema,
  listGroupExpensesQuerySchema,
  listGroupMemberExpensesQuerySchema,
  settleGroupDebtSchema,
} from './groups.validators';

const groupExpenseOperations = createGroupExpensesHealth();

export const groupExpensesRoutes = new Hono<AppContext>()
  .get(
    '/:id/expenses',
    zValidator('param', groupParamsSchema),
    zValidator('query', listGroupExpensesQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupExpenseOperations.listGroupExpenses({
          userId,
          groupId: id,
          limit: query.limit,
          cursor: query.cursor,
        });
        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .get(
    '/:id/members/:memberId/expenses',
    zValidator('param', groupMemberParamsSchema),
    zValidator('query', listGroupMemberExpensesQuerySchema),
    async (c) => {
      const { id, memberId } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupExpenseOperations.listGroupMemberExpenses({
          userId,
          groupId: id,
          memberId,
          limit: query.limit,
          cursor: query.cursor,
          categoryId: query.categoryId,
          uncategorized: query.uncategorized,
          paidOnly: query.paidOnly,
          startDate: query.startDate,
          endDate: query.endDate,
        });
        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .get(
    '/:id/expenses/:expenseId',
    zValidator('param', groupExpenseParamsSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupExpenseOperations.getGroupExpense({
          userId,
          groupId: id,
          expenseId,
        });
        return c.json(result);
      } catch (error) {
        return groupRouteErrorResponse(c, error);
      }
    },
  )
  .post(
    '/:id/expenses',
    zValidator('param', groupParamsSchema),
    zValidator('json', createGroupExpenseSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupExpenseOperations.createExpense({
          userId,
          groupId: id,
          id: data.id,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          categoryId: data.categoryId,
          paidById: data.paidById,
          paidByIds: data.paidByIds,
          payers: data.payers,
          participantIds: data.participantIds,
          splitMethod: data.splitMethod,
          exactShares: data.exactShares,
          lineItems: data.lineItems,
          sharedSplit: data.sharedSplit,
          attachmentImage: data.attachmentImage,
          advancedDetails: data.advancedDetails,
        });
        return c.json(result, 201);
      } catch (error) {
        return groupRouteBadRequestErrorResponse(c, error);
      }
    },
  )
  .put(
    '/:id/expenses/:expenseId',
    zValidator('param', groupExpenseParamsSchema),
    zValidator('json', createGroupExpenseSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupExpenseOperations.updateExpense({
          userId,
          groupId: id,
          expenseId,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          categoryId: data.categoryId,
          paidById: data.paidById,
          paidByIds: data.paidByIds,
          payers: data.payers,
          participantIds: data.participantIds,
          splitMethod: data.splitMethod,
          exactShares: data.exactShares,
          lineItems: data.lineItems,
          sharedSplit: data.sharedSplit,
          attachmentImage: data.attachmentImage,
          advancedDetails: data.advancedDetails,
        });
        return c.json(result);
      } catch (error) {
        return groupRouteBadRequestErrorResponse(c, error);
      }
    },
  )
  .delete(
    '/:id/expenses/:expenseId',
    zValidator('param', groupExpenseParamsSchema),
    async (c) => {
      const { id, expenseId } = c.req.valid('param');
      const { id: userId } = c.get('user');

      try {
        const result = await groupExpenseOperations.deleteExpense({
          userId,
          groupId: id,
          expenseId,
        });
        return c.json(result);
      } catch (error) {
        return groupRouteBadRequestErrorResponse(c, error);
      }
    },
  )
  .post(
    '/:id/settlements',
    zValidator('param', groupParamsSchema),
    zValidator('json', settleGroupDebtSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupExpenseOperations.settleDebt({
          userId,
          groupId: id,
          fromMemberId: data.fromMemberId,
          toMemberId: data.toMemberId,
          amount: data.amount,
          currency: data.currency,
        });
        return c.json(result, 201);
      } catch (error) {
        return groupRouteBadRequestErrorResponse(c, error);
      }
    },
  );
