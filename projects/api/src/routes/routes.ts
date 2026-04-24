import { Hono } from 'hono';

import waitlistRoutes from './waitlists/routes';

const app = new Hono();

app.route('/waitlists', waitlistRoutes);

export default app;
