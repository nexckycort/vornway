import { Context, Effect, Layer, Redacted } from 'effect';
import { env } from '#/config/env';
import { DatabaseClient } from '#/infrastructure/database/database';
import { Email } from '#/infrastructure/email/email';
import { type BetterAuth, makeAuth } from './better-auth.config';

export class Auth extends Context.Service<
  Auth,
  { readonly instance: BetterAuth }
>()('vornway/Auth') {
  static readonly layer = Layer.effect(
    Auth,
    Effect.gen(function* () {
      const db = yield* DatabaseClient;
      const email = yield* Email;
      const baseURL = yield* env.authUrl;
      const secret = yield* env.authSecret;
      const nodeEnv = yield* env.nodeEnv;
      const googleClientId = yield* env.googleClientId;
      const googleClientSecret = yield* env.googleClientSecret;
      const run = Effect.runPromiseWith(yield* Effect.context());

      return Auth.of({
        instance: makeAuth({
          db,
          baseURL,
          secret: Redacted.value(secret),
          development: nodeEnv === 'development',
          google: {
            clientId: googleClientId,
            clientSecret: Redacted.value(googleClientSecret),
          },
          sendVerificationOtp: ({ email: to, otp }) =>
            run(email.sendOtp(to, otp)),
        }),
      });
    }),
  );
}
