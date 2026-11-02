import { Api } from '@vornway/contracts/api';
import { Layer } from 'effect';
import { HttpApiBuilder, HttpApiScalar } from 'effect/http-api';
import { Auth } from '#/infrastructure/auth/auth';
import {
  AdminOnlyLive,
  BetterAuthRoutes,
  SessionAuthLive,
} from '#/infrastructure/auth/http';
import { Database, DatabaseClient } from '#/infrastructure/database/database';
import { Email } from '#/infrastructure/email/email';
import { CorsMiddleware } from '#/infrastructure/http/cors';
import {
  ErrorBoundaryLive,
  ErrorCapture,
  RequestValidationLive,
} from '#/infrastructure/http/errors';
import { HealthRoutes } from '#/infrastructure/http/health';
import { LegacyRoutes } from '#/infrastructure/http/legacy';
import { RequestIdMiddleware } from '#/infrastructure/http/request-id';
import { SecureHeadersMiddleware } from '#/infrastructure/http/secure-headers';
import { NotificationInbox } from '#/infrastructure/notifications/inbox';
import { Push } from '#/infrastructure/push/push';
import { Storage } from '#/infrastructure/storage/storage';
import { UsersHandlers } from '#/modules/users/http';

const ApiRoutes = HttpApiBuilder.layer(Api, {
  openapiPath: '/openapi.json',
}).pipe(
  Layer.provide([
    // One handler layer per module, in alphabetical order.
    UsersHandlers,
  ]),
  Layer.provide([
    AdminOnlyLive,
    ErrorBoundaryLive,
    RequestValidationLive,
    SessionAuthLive,
  ]),
);

export const AppRoutesNoDeps = Layer.mergeAll(
  ApiRoutes,
  BetterAuthRoutes,
  HealthRoutes,
  HttpApiScalar.layer(Api, { path: '/docs' }),
  RequestIdMiddleware,
  SecureHeadersMiddleware,
  CorsMiddleware,
);

export const AppRoutes = Layer.mergeAll(AppRoutesNoDeps, LegacyRoutes).pipe(
  Layer.provide(Auth.layer),
  Layer.provide([
    Database.layer,
    Email.layer,
    NotificationInbox.layer,
    Push.layer,
    Storage.layer,
  ]),
  Layer.provide([DatabaseClient.layer, ErrorCapture.layerLog]),
);
