import {
  AdminOnly,
  AuthUnavailable,
  CurrentUser,
  Forbidden,
  SessionAuth,
  Unauthorized,
} from '@vornway/contracts/modules/auth/contract';
import { Effect, Layer } from 'effect';
import {
  Cookies,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/http';
import { isAdminEmail } from './admin-emails';
import { Auth } from './auth';

export const BetterAuthRoutes = HttpRouter.use((router) =>
  Effect.gen(function* () {
    const auth = yield* Auth;

    const handle = Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const webRequest = yield* HttpServerRequest.toWeb(request);
      const response = yield* Effect.tryPromise(() =>
        auth.instance.handler(webRequest),
      ).pipe(
        Effect.tapError((error) =>
          Effect.logError('Better Auth handler failed', error),
        ),
        Effect.mapError(() => new AuthUnavailable()),
      );
      return HttpServerResponse.fromWeb(response);
    }).pipe(
      Effect.catchTag('AuthUnavailable', () =>
        Effect.succeed(
          HttpServerResponse.jsonUnsafe(
            { _tag: 'AuthUnavailable' },
            { status: 503 },
          ),
        ),
      ),
    );

    yield* router.add('GET', '/api/auth/*', handle);
    yield* router.add('POST', '/api/auth/*', handle);
  }),
);

const requireSession = <E, R>(
  auth: Auth['Service'],
  next: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    E,
    R | CurrentUser
  >,
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const result = yield* Effect.tryPromise(() =>
      auth.instance.api.getSession({
        headers: new Headers(request.headers),
        returnHeaders: true,
      }),
    ).pipe(
      Effect.tapError((error) =>
        Effect.logError('Session verification failed', error),
      ),
      Effect.mapError(() => new AuthUnavailable()),
      Effect.withSpan('auth.session.verify'),
    );
    if (!result.response) return yield* new Unauthorized();

    const user = result.response.user;
    const response = yield* next.pipe(
      Effect.provideService(CurrentUser, {
        id: user.id,
        name: user.name,
        email: user.email,
      }),
    );
    return HttpServerResponse.mergeCookies(
      response,
      Cookies.fromSetCookie(result.headers.getSetCookie()),
    );
  });

export const SessionAuthLive = Layer.effect(
  SessionAuth,
  Effect.gen(function* () {
    const auth = yield* Auth;
    return SessionAuth.of((next) => requireSession(auth, next));
  }),
);

export const AdminOnlyLive = Layer.effect(
  AdminOnly,
  Effect.gen(function* () {
    const auth = yield* Auth;
    return AdminOnly.of((next) =>
      requireSession(
        auth,
        Effect.gen(function* () {
          const user = yield* CurrentUser;
          if (!isAdminEmail(user.email)) return yield* new Forbidden();
          return yield* next;
        }),
      ),
    );
  }),
);
