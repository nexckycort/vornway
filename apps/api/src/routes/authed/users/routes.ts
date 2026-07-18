import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { AppContext } from '#/shared/types/app';
import {
  searchUsersQuerySchema,
  updateUserAvatarSchema,
  updateUsernameSchema,
} from './schema';
import { searchUsers } from './search-users.query';
import { updateCurrentUserImage } from './update-user-avatar.command';
import { updateCurrentUserUsername } from './update-username.command';

export const usersRoutes = new Hono<AppContext>()
  .get('/search', zValidator('query', searchUsersQuerySchema), async (c) => {
    const { query } = c.req.valid('query');
    const { id: userId } = c.get('user');

    const result = await searchUsers({ userId, query });
    return c.json(result);
  })
  .patch(
    '/me/username',
    zValidator('json', updateUsernameSchema),
    async (c) => {
      const { username } = c.req.valid('json');
      const { id: userId } = c.get('user');

      const result = await updateCurrentUserUsername({ userId, username });
      return c.json(result);
    },
  )
  .patch('/me/image', zValidator('json', updateUserAvatarSchema), async (c) => {
    const { dataUrl } = c.req.valid('json');
    const { id: userId } = c.get('user');

    const result = await updateCurrentUserImage({ userId, dataUrl });
    return c.json(result);
  });

export default usersRoutes;

export type UsersRpc = typeof usersRoutes;
export type UsersAppType = UsersRpc;
