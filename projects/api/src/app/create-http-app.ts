import { Hono } from 'hono';

import routes from '../routes/routes';
import { createMcpHttpRouter } from './mcp-http-routes';
import { registerHttpModules } from './modules';

export function createHttpApp(): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json({ service: 'vornway-api', status: 'ok' }));

  app.route('/api', routes);

  app.route('/', createMcpHttpRouter());
  registerHttpModules(app);

  return app;
}
