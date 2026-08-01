import { createMiddleware } from 'hono/factory';

import type { AppContext } from '#/shared/types/app';

const ALLOWED_ADMIN_EMAILS = new Set([
  'junior110120@gmail.com',
  'viianysvanessa@gmail.com',
]);

export const adminMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const { email } = c.get('user');

  if (!ALLOWED_ADMIN_EMAILS.has(email?.trim().toLowerCase() ?? '')) {
    return c.json({ error: 'No autorizado' }, 403);
  }

  return next();
});
