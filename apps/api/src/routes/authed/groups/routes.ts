import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createGroupsService } from '~/modules/groups/service';
import type { AppContext } from '~/shared/types/app';
import { createGroupSchema, listGroupsQuerySchema } from './groups.validators';

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
    });

    return c.json(group, 201);
  })
  .get('/', zValidator('query', listGroupsQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const groups = await groupsService.listGroups({
      userId,
      limit: query.limit,
      cursor: query.cursor,
    });
    return c.json(groups);
  });

export default groups;
