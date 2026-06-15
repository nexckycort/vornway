import { Hono } from 'hono';

import { authMiddleware } from '~/shared/middlewares/auth.middleware';
import adminRoutes from './admin/routes';
import converterRoutes from './converter/routes';
import goalsRoutes from './goals/routes';
import groupsRoutes from './groups/routes';
import homeRoutes from './home/routes';
import invitesRoutes from './invites/routes';
import mapsRoutes from './maps/routes';
import notificationsRoutes from './notifications/routes';
import pushRoutes from './push/routes';
import usersRoutes from './users/routes';

const app = new Hono()
  .basePath('/api')
  .use(authMiddleware)
  .route('/converter', converterRoutes)
  .route('/invites', invitesRoutes)
  .route('/goals', goalsRoutes)
  .route('/home', homeRoutes)
  .route('/maps', mapsRoutes)
  .route('/notifications', notificationsRoutes)
  .route('/push', pushRoutes)
  .route('/users', usersRoutes)
  .route('/admin', adminRoutes)
  .route('/groups', groupsRoutes);

export default app;
export type AuthedRoutes = typeof app;
