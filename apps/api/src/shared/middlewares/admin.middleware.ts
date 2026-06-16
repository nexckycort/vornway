import { createMiddleware } from 'hono/factory';

import type { AppContext } from '~/shared/types/app';

export const ALLOWED_ADMIN_EMAIL = 'junior110120@gmail.com';

export const adminMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const { email } = c.get('user');

  if (email?.trim().toLowerCase() !== ALLOWED_ADMIN_EMAIL) {
    return c.json({ error: 'No autorizado' }, 403);
  }

  return next();
});
