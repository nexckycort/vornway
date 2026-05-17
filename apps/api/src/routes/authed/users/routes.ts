import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createUsersService } from '~/modules/users/service';
import type { AppContext } from '~/shared/types/app';
import { searchUsersQuerySchema } from './users.validators';

const usersService = createUsersService();

const app = new Hono<AppContext>().get(
  '/search',
  zValidator('query', searchUsersQuerySchema),
  async (c) => {
    const { query } = c.req.valid('query');
    const { id: userId } = c.get('user');
    const result = await usersService.searchUsers({ userId, query });
    return c.json(result);
  },
);

export default app;
