import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { env } from '#/config/env';
import { auth } from '#/infrastructure/auth/better-auth.config';
import authedRoutes from '../routes/authed/routes';
import publicRoutes from '../routes/public/routes';
import { createMcpHttpRouter } from './mcp-http-routes';

export function createHttpApp(): Hono {
  const app = new Hono();

  app.use(secureHeaders());

  app.get('/', (c) => c.json({ service: 'vornway-api', status: 'ok' }));

  app.use(
    cors({
      origin: [
        'https://vornway.com',
        'https://www.vornway.com',
        'https://app.vornway.com',
      ],
      exposeHeaders: ['Content-Length'],
      maxAge: 600,
      credentials: true,
    }),
  );

  app.get('/version', (c) =>
    c.json({
      version: process.env.APP_VERSION ?? 'unknown',
    }),
  );

  app.on(['POST', 'GET'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
  });

  app.route('/', publicRoutes).route('/', authedRoutes);

  app.route('/', createMcpHttpRouter());
  // registerHttpModules(app);

  return app;
}
