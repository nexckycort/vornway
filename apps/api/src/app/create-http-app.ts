import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

import { env } from '#/config/env';
import { auth } from '#/infrastructure/auth/better-auth.config';
import { AppError } from '#/shared/errors/app-error';
import { isErrorMetadata } from '#/shared/errors/is-error-metadata';
import authedRoutes from '../routes/authed/routes';
import { createLoginOperations } from '../routes/public/login/auth/login-operations';
import { createOAuthRouter } from '../routes/public/login/oauth/routes';
import publicRoutes from '../routes/public/routes';
import { createMcpHttpRouter } from './mcp-http-routes';

export function createHttpApp(): Hono {
  const app = new Hono();

  app.use(secureHeaders());

  app.get('/', (c) => c.json({ service: 'vornway-api', status: 'ok' }));

  app.use(
    cors({
      origin:
        env.NODE_ENV === 'development'
          ? 'https://app.vornway.localhost'
          : [
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

  app.onError((error, c) => {
    if (error instanceof AppError || isErrorMetadata(error)) {
      if (error.status >= 500) {
        console.error('Handled request error', {
          code: error.code,
          message: error.message,
          cause: 'cause' in error ? error.cause : undefined,
        });
      }

      return c.json(
        {
          code: error.code,
          message: error.message,
        },
        error.status,
      );
    }

    console.error('Unhandled request error', error);

    return c.json(
      {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error interno del servidor',
      },
      500,
    );
  });

  app
    .route('/', publicRoutes)
    .route('/oauth', createOAuthRouter(createLoginOperations()))
    .route('/', authedRoutes);

  app.route('/', createMcpHttpRouter());
  // registerHttpModules(app);

  return app;
}
