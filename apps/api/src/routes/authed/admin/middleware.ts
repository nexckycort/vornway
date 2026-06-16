import type { MiddlewareHandler } from 'hono';
import type { AppContext } from '~/shared/types/app';

const ALLOWED_EMAIL = 'junior110120@gmail.com';

export const adminMiddleware: MiddlewareHandler<AppContext> = async (
  c,
  next,
) => {
  const { email } = c.get('user');

  if (email?.toLowerCase().trim() !== ALLOWED_EMAIL) {
    return c.json({ error: 'No autorizado' }, 403);
  }

  await next();
};
