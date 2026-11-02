import { Hono } from 'hono';

import { authMiddleware } from '#/shared/middlewares/auth.middleware';

const app = new Hono().basePath('/api').use(authMiddleware);

export default app;
