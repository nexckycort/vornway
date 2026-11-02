import { Api } from '@vornway/contracts/api';
import { Layer } from 'effect';
import { FetchHttpClient } from 'effect/http';
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
import { AdminHandlers } from '#/modules/admin/http';
import { ConverterHandlers } from '#/modules/converter/http';
import { DebtsHandlers } from '#/modules/debts/http';
import { FeedbackHandlers } from '#/modules/feedback/http';
import { FinancesHandlers } from '#/modules/finances/http';
import { GoalsHandlers } from '#/modules/goals/http';
import { GroupsHandlers } from '#/modules/groups/http';
import { HomeHandlers } from '#/modules/home/http';
import { InvitesHandlers } from '#/modules/invites/http';
import { LoginHandlers } from '#/modules/login/http';
import { MapsHandlers } from '#/modules/maps/http';
import { McpRoutes } from '#/modules/mcp/routes';
import { MediaRoutes } from '#/modules/media/routes';
import { NotificationsHandlers } from '#/modules/notifications/http';
import { MetadataRoutes } from '#/modules/oauth/metadata';
import { OAuthRoutes } from '#/modules/oauth/routes';
import { PushHandlers } from '#/modules/push/http';
import { QuickSplitsHandlers } from '#/modules/quick-splits/http';
import { UsersHandlers } from '#/modules/users/http';

const ApiRoutes = HttpApiBuilder.layer(Api, {
  openapiPath: '/openapi.json',
}).pipe(
  Layer.provide([
    // One handler layer per module, in alphabetical order.
    AdminHandlers,
    ConverterHandlers,
    FeedbackHandlers,
    HomeHandlers,
    DebtsHandlers,
    FinancesHandlers,
    GoalsHandlers,
    GroupsHandlers,
    InvitesHandlers,
    LoginHandlers,
    MapsHandlers,
    NotificationsHandlers,
    PushHandlers,
    QuickSplitsHandlers,
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
  McpRoutes,
  MediaRoutes,
  MetadataRoutes,
  OAuthRoutes,
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
  Layer.provide([
    DatabaseClient.layer,
    ErrorCapture.layerLog,
    FetchHttpClient.layer,
  ]),
);
