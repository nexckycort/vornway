import { Hono } from 'hono';
import loginRoutes from './login/routes';
import mediaRoutes from './media/routes';

export const publicRoutes = new Hono()
  .basePath('/api')
  .route('/media', mediaRoutes)
  .route('/login', loginRoutes);

export default publicRoutes;
export type PublicRoutes = typeof publicRoutes;
