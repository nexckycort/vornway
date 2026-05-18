import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createGroupsService } from '~/modules/groups/service';
import type { AppContext } from '~/shared/types/app';
import {
  addGroupMemberSchema,
  createGroupExpenseSchema,
  createGroupSchema,
  groupExpenseParamsSchema,
  groupParamsSchema,
  listGroupExpensesQuerySchema,
  listGroupsQuerySchema,
  searchGroupMembersQuerySchema,
  settleGroupDebtSchema,
} from './groups.validators';

const groupsService = createGroupsService();

const groups = new Hono<AppContext>()
  .post('/', zValidator('json', createGroupSchema), async (c) => {
    const data = c.req.valid('json');
    const { id: userId, name, email } = c.get('user');

    const group = await groupsService.createGroup({
      userId,
      ownerName: name?.trim() || email || 'Usuario',
      name: data.name,
      type: data.type,
      description: data.description,
      participants: data.participants,
    });

    return c.json(group, 201);
  })
  .get('/', zValidator('query', listGroupsQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const result = await groupsService.listGroups({
      userId,
      limit: query.limit,
      cursor: query.cursor,
      search: query.search,
      filter: query.filter,
    });

    return c.json(result);
  })
  .get('/:id', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupsService.getGroupSummary({
        userId,
        groupId: id,
      });
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Grupo no encontrado') {
        return c.json({ error: error.message }, 404);
      }
      throw error;
    }
  })
  .get(
    '/:id/expenses',
    zValidator('param', groupParamsSchema),
    zValidator('query', listGroupExpensesQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const query = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.listGroupExpenses({
          userId,
          groupId: id,
          limit: query.limit,
          cursor: query.cursor,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error && error.message === 'Grupo no encontrado') {
          return c.json({ error: error.message }, 404);
        }
        throw error;
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
        const result = await groupsService.getGroupExpense({
          userId,
          groupId: id,
          expenseId,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Grupo no encontrado') {
            return c.json({ error: error.message }, 404);
          }
          if (error.message === 'Gasto no encontrado') {
            return c.json({ error: error.message }, 404);
          }
        }
        throw error;
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
        const result = await groupsService.createExpense({
          userId,
          groupId: id,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          paidById: data.paidById,
          participantIds: data.participantIds,
          splitMethod: data.splitMethod,
          exactShares: data.exactShares,
        });
        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
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
        const result = await groupsService.updateExpense({
          userId,
          groupId: id,
          expenseId,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          paidById: data.paidById,
          participantIds: data.participantIds,
          splitMethod: data.splitMethod,
          exactShares: data.exactShares,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
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
        const result = await groupsService.deleteExpense({
          userId,
          groupId: id,
          expenseId,
        });
        return c.json(result);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
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
        const result = await groupsService.settleDebt({
          userId,
          groupId: id,
          fromMemberId: data.fromMemberId,
          toMemberId: data.toMemberId,
          amount: data.amount,
          currency: data.currency,
        });
        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  )
  .get(
    '/:id/members/search',
    zValidator('param', groupParamsSchema),
    zValidator('query', searchGroupMembersQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { query } = c.req.valid('query');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.searchMembers({
          userId,
          groupId: id,
          query,
        });

        return c.json(result);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === 'No tienes acceso a este grupo'
        ) {
          return c.json({ error: error.message }, 400);
        }

        throw error;
      }
    },
  )
  .post(
    '/:id/members',
    zValidator('param', groupParamsSchema),
    zValidator('json', addGroupMemberSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');
      const { id: userId } = c.get('user');

      try {
        const result = await groupsService.addMember({
          userId,
          groupId: id,
          name: data.name,
          linkedUserId: data.linkedUserId,
        });
        return c.json(result, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: error.message }, 400);
        }
        throw error;
      }
    },
  );

export default groups;
