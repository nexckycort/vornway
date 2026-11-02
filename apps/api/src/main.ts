import { BunHttpServer, BunRuntime } from '@effect/platform-bun';
import { Layer } from 'effect';
import { HttpRouter } from 'effect/http';
import { AppRoutes } from './app';

const ServerLive = HttpRouter.serve(AppRoutes).pipe(
  Layer.provide(BunHttpServer.layer({ hostname: '0.0.0.0', port: 3000 })),
);

BunRuntime.runMain(Layer.launch(ServerLive));
