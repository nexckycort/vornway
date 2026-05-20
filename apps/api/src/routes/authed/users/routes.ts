import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { createUsersService } from '~/modules/users/service';
import type { AppContext } from '~/shared/types/app';
import {
  searchUsersQuerySchema,
  updateUserImageSchema,
} from './users.validators';

const usersService = createUsersService();

const app = new Hono<AppContext>()
  .get('/search', zValidator('query', searchUsersQuerySchema), async (c) => {
    const { query } = c.req.valid('query');
    const { id: userId } = c.get('user');
    const result = await usersService.searchUsers({ userId, query });
    return c.json(result);
  })
  .patch('/me/image', zValidator('json', updateUserImageSchema), async (c) => {
    const { dataUrl } = c.req.valid('json');
    const { id: userId } = c.get('user');

    try {
      const result = await usersService.updateCurrentUserImage({
        userId,
        dataUrl,
      });

      return c.json(result);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Usuario no encontrado') {
          return c.json({ error: error.message }, 404);
        }

        return c.json({ error: error.message }, 400);
      }

      throw error;
    }
  });

export default app;
