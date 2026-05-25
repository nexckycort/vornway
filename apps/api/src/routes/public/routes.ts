import { Hono } from 'hono';

import mediaRoutes from './media/routes';
import loginRoutes from './login/routes';

const app = new Hono()
  .basePath('/api')
  .route('/media', mediaRoutes)
  .route('/login', loginRoutes);

export default app;
export type PublicRoutes = typeof app;
