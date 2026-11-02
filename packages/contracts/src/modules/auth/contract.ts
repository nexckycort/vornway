import { Context, Effect, Schema } from 'effect';
import { HttpApiMiddleware } from 'effect/http-api';

export const SessionUser = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
});

export class CurrentUser extends Context.Service<
  CurrentUser,
  typeof SessionUser.Type
>()('@vornway/contracts/modules/auth/contract/CurrentUser') {}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  'Unauthorized',
  {
    message: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('Authentication required')),
    ),
  },
  { httpApiStatus: 401 },
) {}
export class Forbidden extends Schema.TaggedError<Forbidden>()(
  'Forbidden',
  {
    error: Schema.String.pipe(
      Schema.withConstructorDefault(Effect.succeed('No autorizado')),
    ),
  },
  { httpApiStatus: 403 },
) {}
export class AuthUnavailable extends Schema.TaggedError<AuthUnavailable>()(
  'AuthUnavailable',
  {},
  { httpApiStatus: 503 },
) {}

export class SessionAuth extends HttpApiMiddleware.Service<
  SessionAuth,
  { provides: CurrentUser }
>()('@vornway/contracts/modules/auth/contract/SessionAuth', {
  error: [Unauthorized, AuthUnavailable],
}) {}

export class AdminOnly extends HttpApiMiddleware.Service<
  AdminOnly,
  { provides: CurrentUser }
>()('@vornway/contracts/modules/auth/contract/AdminOnly', {
  error: [Unauthorized, Forbidden, AuthUnavailable],
}) {}
