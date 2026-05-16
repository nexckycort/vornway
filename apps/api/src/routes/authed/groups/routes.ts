import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createGroupsService } from '~/modules/groups/service';
import type { AppContext } from '~/shared/types/app';
import {
  createGroupSchema,
  groupParamsSchema,
  listGroupExpensesQuerySchema,
  listGroupsQuerySchema,
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
    });

    return c.json(result);
  })
  .get('/:id', zValidator('param', groupParamsSchema), async (c) => {
    const { id } = c.req.valid('param');
    const { id: userId } = c.get('user');

    try {
      const result = await groupsService.getGroupSummary({ userId, groupId: id });
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
  );

export default groups;
