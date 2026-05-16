import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppContext } from '~/shared/types/app';
import { GroupsService } from './groups.service';
import { listGroupsQuerySchema } from './groups.validators';

const groupsService = new GroupsService();

const groups = new Hono<AppContext>().get(
  '/',
  zValidator('query', listGroupsQuerySchema),
  async (c) => {
    const query = c.req.valid('query');
    const { id: userId } = c.get('user');

    const groups = await groupsService.findAll(userId, query);
    return c.json(groups);
  },
);

export default groups;
