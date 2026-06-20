import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppContext } from '#/shared/types/app';
import { searchUsersQuerySchema, updateUserAvatarSchema } from './schema';
import { userService } from './service';

const users = new Hono<AppContext>()
  .get('/search', zValidator('query', searchUsersQuerySchema), async (c) => {
    const { query } = c.req.valid('query');
    const { id: userId } = c.get('user');
    const result = await userService.searchUsers({ userId, query });
    return c.json(result);
  })
  .patch('/me/image', zValidator('json', updateUserAvatarSchema), async (c) => {
    const { dataUrl } = c.req.valid('json');
    const { id: userId } = c.get('user');

    try {
      const result = await userService.updateCurrentUserImage({
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

export default users;

export type UsersAppType = typeof users;
