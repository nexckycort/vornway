import { Hono } from 'hono';

import mediaRoutes from './media/routes';
import loginRoutes from './login/routes';
import waitlistRoutes from './waitlists/routes';

const app = new Hono()
  .basePath('/api')
  .route('/media', mediaRoutes)
  .route('/login', loginRoutes)
  .route('/waitlist', waitlistRoutes);

export default app;
export type PublicRoutes = typeof app;
