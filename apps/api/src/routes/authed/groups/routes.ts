import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { createGroupsService } from '~/modules/groups/service';
import type { AppContext } from '~/shared/types/app';
import { listGroupsQuerySchema } from './groups.validators';

const groupsService = createGroupsService();

const groups = new Hono<AppContext>().get(
  '/',
  zValidator('query', listGroupsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const groups = await groupsService.listGroups({
      userId,
      limit: query.limit,
      cursor: query.cursor,
    });
    return c.json(groups);
  },
);

export default groups;
