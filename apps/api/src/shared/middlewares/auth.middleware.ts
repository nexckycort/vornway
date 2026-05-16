import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import { auth } from '~/infrastructure/auth/better-auth.config';

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    throw new HTTPException(401, {
      message: 'Authentication required',
    });
  }

  c.set('user', session.user);
  c.set('session', session.session);
  return next();
});
