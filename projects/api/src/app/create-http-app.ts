import { Hono } from 'hono';
import { cors } from 'hono/cors';

import routes from '../routes/routes';
import { createMcpHttpRouter } from './mcp-http-routes';
import { registerHttpModules } from './modules';

export function createHttpApp(): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json({ service: 'vornway-api', status: 'ok' }));

  app.use('/api/*', cors());
  app.route('/api', routes);

  app.route('/', createMcpHttpRouter());
  registerHttpModules(app);

  return app;
}
