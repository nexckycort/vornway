import { Hono } from 'hono';

import { authMiddleware } from '~/shared/middlewares/auth.middleware';
import groupsRoutes from './groups/routes';

const app = new Hono()
  .basePath('/api')
  .use('*', authMiddleware)
  .route('/groups', groupsRoutes);

export default app;
export type AuthedRoutes = typeof app;
