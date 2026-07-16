import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { runHttpEffect } from '#/shared/effect/run-effect';
import type { AppContext } from '#/shared/types/app';
import {
  searchUsersQuerySchema,
  updateUserAvatarSchema,
  updateUsernameSchema,
} from './schema';
import { userService } from './service';

const users = new Hono<AppContext>()
  .get('/search', zValidator('query', searchUsersQuerySchema), async (c) => {
    const { query } = c.req.valid('query');
    const { id: userId } = c.get('user');

    return runHttpEffect(
      c,
      userService.searchUsers({
        userId,
        query,
      }),
    );
  })
  .patch(
    '/me/username',
    zValidator('json', updateUsernameSchema),
    async (c) => {
      const { username } = c.req.valid('json');
      const { id: userId } = c.get('user');

      return runHttpEffect(
        c,
        userService.updateCurrentUserUsername({
          userId,
          username,
        }),
      );
    },
  )
  .patch('/me/image', zValidator('json', updateUserAvatarSchema), async (c) => {
    const { dataUrl } = c.req.valid('json');
    const { id: userId } = c.get('user');

    return runHttpEffect(
      c,
      userService.updateCurrentUserImage({
        userId,
        dataUrl,
      }),
    );
  });

export default users;

export type UsersAppType = typeof users;
