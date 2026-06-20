import { Hono } from 'hono';

import { auth } from '#/infrastructure/auth/better-auth.config';

export function createAuthProxyRouter(): Hono {
  const router = new Hono({ strict: false });

  router.on(['POST', 'GET'], '/*', (c) => {
    return auth.handler(c.req.raw);
  });

  return router;
}
