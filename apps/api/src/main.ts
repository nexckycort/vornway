import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import { Effect, Layer } from 'effect';
import { HttpRouter } from 'effect/http';
import { AppRoutes } from '#/app';
import { env } from '#/config/env';

const ServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const nodeEnv = yield* env.nodeEnv;
    return HttpRouter.serve(AppRoutes, {
      disableLogger: nodeEnv !== 'development',
    });
  }),
).pipe(
  Layer.provide(
    BunHttpServer.layerConfig({ hostname: env.host, port: env.port }),
  ),
);

BunRuntime.runMain(Layer.launch(ServerLive));
