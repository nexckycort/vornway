import type { InternalError } from '@vornway/contracts/errors';
import { Unauthorized } from '@vornway/contracts/modules/auth/contract';
import {
  GoogleSessionMissing,
  InvalidEmailDomain,
  type LoginUser,
  LoginUserAlreadyExists,
  LoginUserNotFound,
  type McpToken,
  OtpRejected,
  type OtpSent,
} from '@vornway/contracts/modules/login/contract';
import { Context, Data, Effect, Layer } from 'effect';
import { Auth } from '#/infrastructure/auth/auth';
import type { BetterAuth } from '#/infrastructure/auth/better-auth.config';
import { Database } from '#/infrastructure/database/database';
import { makeInternalFailure } from '#/infrastructure/http/errors';
import { McpTokens } from '../mcp/token';
import { isAllowedLoginEmail } from './validators';

type Credentials = { readonly email: string; readonly otp: string };
type PreviousAccount = {
  readonly previousUserId?: string | undefined;
  readonly wasAnonymous?: boolean | undefined;
};

class AuthCallFailed extends Data.TaggedError('AuthCallFailed')<{
  readonly cause: unknown;
}> {}

export class Login extends Context.Service<
  Login,
  {
    sendOtp(input: {
      readonly email: string;
      readonly name?: string | undefined;
    }): Effect.Effect<
      typeof OtpSent.Type,
      | InvalidEmailDomain
      | LoginUserAlreadyExists
      | LoginUserNotFound
      | InternalError
    >;
    verifyOtp(
      input: Credentials & PreviousAccount,
    ): Effect.Effect<typeof LoginUser.Type, OtpRejected | InternalError>;
    syncGoogleSession(
      headers: Headers,
      input: PreviousAccount,
    ): Effect.Effect<
      typeof LoginUser.Type,
      GoogleSessionMissing | InternalError
    >;
    currentUser(
      headers: Headers,
    ): Effect.Effect<typeof LoginUser.Type, Unauthorized | InternalError>;
    mcpToken(
      input: Credentials,
    ): Effect.Effect<typeof McpToken.Type, OtpRejected | InternalError>;
  }
>()('vornway/login/Login') {
  static readonly layer = Layer.effect(
    Login,
    Effect.gen(function* () {
      const auth = (yield* Auth).instance;
      const database = yield* Database;
      const tokens = yield* McpTokens;
      const failInternal = yield* makeInternalFailure;

      const call = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: (cause) => new AuthCallFailed({ cause }),
        });

      const sessionUser = (headers: Headers) =>
        call(() => auth.api.getSession({ headers })).pipe(
          Effect.map((session) => (session ? toLoginUser(session.user) : null)),
          Effect.catchTag('AuthCallFailed', failInternal),
        );

      const adoptAnonymousAccount = Effect.fn('Login.adoptAnonymousAccount')(
        function* (previous: PreviousAccount, user: typeof LoginUser.Type) {
          const previousUserId = previous.previousUserId;
          if (!previous.wasAnonymous || !previousUserId) return;
          if (previousUserId === user.id) return;

          yield* database.use((db) =>
            db.groupMember.updateMany({
              where: { userId: previousUserId },
              data: { userId: user.id },
            }),
          );
          yield* database
            .transaction(async (tx) => {
              await tx.session.deleteMany({
                where: { userId: previousUserId },
              });
              await tx.account.deleteMany({
                where: { userId: previousUserId },
              });
              await tx.user.delete({ where: { id: previousUserId } });
            })
            .pipe(Effect.ignore({ log: true }));
        },
      );

      const sendOtp = Effect.fn('Login.sendOtp')(function* (input: {
        readonly email: string;
        readonly name?: string | undefined;
      }) {
        const email = input.email.toLowerCase().trim();
        if (!isAllowedLoginEmail(email)) return yield* new InvalidEmailDomain();

        const existing = yield* database.use((db) =>
          db.user.findUnique({ select: { id: true }, where: { email } }),
        );
        if (input.name) {
          if (existing) return yield* new LoginUserAlreadyExists();
          const name = input.name;
          yield* call(() =>
            auth.api.signUpEmail({
              body: { email, name, password: crypto.randomUUID() },
            }),
          ).pipe(Effect.catchTag('AuthCallFailed', failInternal));
        } else if (!existing) {
          return yield* new LoginUserNotFound();
        }

        yield* call(() =>
          auth.api.sendVerificationOTP({ body: { email, type: 'sign-in' } }),
        ).pipe(Effect.catchTag('AuthCallFailed', failInternal));
        return {
          code: 'OTP_SENT' as const,
          message: 'Código de verificación enviado',
        };
      });

      const verifyOtp = Effect.fn('Login.verifyOtp')(function* (
        input: Credentials & PreviousAccount,
      ) {
        const email = input.email.toLowerCase().trim();
        const otp = input.otp.replace(/\s+/g, '').trim();
        const signedIn = yield* call(() =>
          auth.api.signInEmailOTP({ body: { email, otp } }),
        ).pipe(
          Effect.tapError((error) =>
            Effect.logWarning('OTP login failed', {
              email,
              otpLength: otp.length,
              error: error.cause,
            }),
          ),
          Effect.mapError(
            (error) => new OtpRejected({ error: otpRejection(error.cause) }),
          ),
        );

        const user = toLoginUser(signedIn.user);
        yield* adoptAnonymousAccount(input, user);
        return user;
      });

      const syncGoogleSession = Effect.fn('Login.syncGoogleSession')(function* (
        headers: Headers,
        input: PreviousAccount,
      ) {
        const user = yield* sessionUser(headers);
        if (!user) return yield* new GoogleSessionMissing();

        yield* adoptAnonymousAccount(input, user);
        return user;
      });

      const currentUser = Effect.fn('Login.currentUser')(function* (
        headers: Headers,
      ) {
        const user = yield* sessionUser(headers);
        if (!user) return yield* new Unauthorized();
        return user;
      });

      const mcpToken = Effect.fn('Login.mcpToken')(function* (
        input: Credentials,
      ) {
        const user = yield* verifyOtp(input);
        const token = yield* tokens.issue(user);
        return {
          tokenType: 'Bearer' as const,
          accessToken: token.accessToken,
          expiresIn: token.expiresIn,
          user,
        };
      });

      return Login.of({
        sendOtp,
        verifyOtp,
        syncGoogleSession,
        currentUser,
        mcpToken,
      });
    }),
  );
}

type SessionUser = NonNullable<
  Awaited<ReturnType<BetterAuth['api']['getSession']>>
>['user'];

type AuthUser = Pick<
  SessionUser,
  'id' | 'email' | 'name' | 'emailVerified' | 'createdAt' | 'updatedAt'
> &
  Partial<Pick<SessionUser, 'image' | 'username' | 'isAnonymous'>>;

const toLoginUser = (user: AuthUser): typeof LoginUser.Type => ({
  id: user.id,
  email: user.email,
  name: user.name,
  emailVerified: user.emailVerified,
  ...(user.image === undefined ? {} : { image: user.image }),
  ...(user.username === undefined ? {} : { username: user.username }),
  ...(user.isAnonymous === undefined ? {} : { isAnonymous: user.isAnonymous }),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const otpRejection = (cause: unknown) =>
  cause instanceof Error && cause.message.includes('expired')
    ? 'Código OTP expirado'
    : 'Código OTP incorrecto o expirado';
