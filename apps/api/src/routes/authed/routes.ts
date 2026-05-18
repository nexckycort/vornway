import { Hono } from 'hono';

import { authMiddleware } from '~/shared/middlewares/auth.middleware';
import converterRoutes from './converter/routes';
import goalsRoutes from './goals/routes';
import groupsRoutes from './groups/routes';
import homeRoutes from './home/routes';
import invitesRoutes from './invites/routes';
import pushRoutes from './push/routes';
import usersRoutes from './users/routes';

const app = new Hono()
  .basePath('/api')
  .use(authMiddleware)
  .route('/converter', converterRoutes)
  .route('/invites', invitesRoutes)
  .route('/goals', goalsRoutes)
  .route('/home', homeRoutes)
  .route('/push', pushRoutes)
  .route('/users', usersRoutes)
  .route('/groups', groupsRoutes);

export default app;
export type AuthedRoutes = typeof app;
