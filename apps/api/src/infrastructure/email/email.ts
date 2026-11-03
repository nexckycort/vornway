import { Context, Data, Effect, Layer, Redacted } from 'effect';
import { Resend } from 'resend';
import { env } from '#/config/env';
import { OTP_EMAIL_FROM, OTP_EMAIL_SUBJECT, otpEmailHtml } from './otp-email';

export class EmailError extends Data.TaggedError('EmailError')<{
  readonly cause: unknown;
}> {}

const SEND_TIMEOUT = '10 seconds';

export class Email extends Context.Service<
  Email,
  {
    readonly sendOtp: (
      email: string,
      otp: string,
    ) => Effect.Effect<void, EmailError>;
  }
>()('@vornway/api/infrastructure/email/email') {
  static readonly layer = Layer.effect(
    Email,
    Effect.gen(function* () {
      if ((yield* env.nodeEnv) !== 'production') {
        return Email.of({
          sendOtp: Effect.fn('Email.sendOtp')(function* (email, otp) {
            yield* Effect.logInfo(`OTP for ${email}: ${otp}`);
          }),
        });
      }

      const resend = new Resend(Redacted.value(yield* env.resendApiKey));

      return Email.of({
        sendOtp: Effect.fn('Email.sendOtp')(function* (email, otp) {
          const { error } = yield* Effect.tryPromise({
            try: () =>
              resend.emails.send({
                from: OTP_EMAIL_FROM,
                to: email,
                subject: OTP_EMAIL_SUBJECT,
                html: otpEmailHtml(otp),
              }),
            catch: (cause) => new EmailError({ cause }),
          }).pipe(
            Effect.timeout(SEND_TIMEOUT),
            Effect.catchTag('TimeoutError', (cause) =>
              Effect.fail(new EmailError({ cause })),
            ),
          );
          if (error) return yield* new EmailError({ cause: error });
        }),
      });
    }),
  );
}
