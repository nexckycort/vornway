import { createMiddleware } from 'hono/factory';

import { isAdminEmail } from '#/infrastructure/auth/admin-emails';
import type { AppContext } from '#/shared/types/app';

export const adminMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const { email } = c.get('user');

  if (!isAdminEmail(email)) {
    return c.json({ error: 'No autorizado' }, 403);
  }

  return next();
});
