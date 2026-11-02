import { Data, Effect } from 'effect';
import type { Device, TestApp } from './app';

class SignInFailed extends Data.TaggedError('SignInFailed')<{
  readonly email: string;
  readonly status: number;
}> {}

export const signInWithEmail = (app: TestApp, device: Device, email: string) =>
  Effect.gen(function* () {
    const sent = yield* device.post(
      '/api/auth/email-otp/send-verification-otp',
      { email, type: 'sign-in' },
    );
    if (sent.status !== 200) return sent;
    return yield* device.post('/api/auth/sign-in/email-otp', {
      email,
      otp: app.email.otpFor(email),
    });
  });

export const signIn = (app: TestApp, email: string) =>
  Effect.gen(function* () {
    const device = app.device();
    const response = yield* signInWithEmail(app, device, email);
    if (response.status !== 200) {
      return yield* new SignInFailed({ email, status: response.status });
    }
    const { user } = response.body as { user: { id: string } };
    return { device, id: user.id, email };
  });
