import { Effect, Layer } from 'effect';
import { HttpRouter } from 'effect/http';
import { env } from '#/config/env';

const DEV_ORIGINS = ['https://app.dev.vornway.com'];
const PROD_ORIGINS = [
  'https://vornway.com',
  'https://www.vornway.com',
  'https://app.vornway.com',
];

export const CorsMiddleware = Layer.unwrap(
  Effect.gen(function* () {
    const nodeEnv = yield* env.nodeEnv;
    return HttpRouter.cors({
      allowedOrigins: nodeEnv === 'development' ? DEV_ORIGINS : PROD_ORIGINS,
      exposedHeaders: ['Content-Length'],
      maxAge: 600,
      credentials: true,
    });
  }),
);
