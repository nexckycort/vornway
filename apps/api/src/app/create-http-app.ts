import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { env } from '~/config/env';
import publicRoutes from '../routes/public/routes';
import { createMcpHttpRouter } from './mcp-http-routes';
import { registerHttpModules } from './modules';

export function createHttpApp(): Hono {
  const app = new Hono();

  app.use(logger());
  app.use(secureHeaders());

  app.get('/', (c) => c.json({ service: 'vornway-api', status: 'ok' }));

  app.use(
    cors({
      origin: [
        env.BETTER_AUTH_URL,
        'https://vornway.com',
        'https://www.vornway.com',
      ],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
      credentials: true,
    }),
  );

  app.route('/', publicRoutes);

  app.route('/', createMcpHttpRouter());
  registerHttpModules(app);

  return app;
}
