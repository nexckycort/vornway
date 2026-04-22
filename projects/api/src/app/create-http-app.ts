import { Hono } from 'hono';
import { registerHttpModules } from './modules';

export function createHttpApp(): Hono {
  const app = new Hono();

  app.get('/', (c) => c.json({ service: 'vornway-api', status: 'ok' }));

  registerHttpModules(app);

  return app;
}
