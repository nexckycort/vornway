import { env } from '#/config/legacy-env';
import { db } from '#/infrastructure/database/connection';
import {
  OTP_EMAIL_FROM,
  OTP_EMAIL_SUBJECT,
  otpEmailHtml,
} from '#/infrastructure/email/otp-email';
import { resend } from '#/infrastructure/email/resend.config';
import { makeAuth } from './better-auth.config';

export const auth = makeAuth({
  db,
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  development: env.NODE_ENV === 'development',
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
  sendVerificationOtp: async (data) => {
    console.log(data.email, data.otp);
    if (env.NODE_ENV === 'production') {
      await resend.emails.send({
        from: OTP_EMAIL_FROM,
        to: data.email,
        subject: OTP_EMAIL_SUBJECT,
        html: otpEmailHtml(data.otp),
      });
    }
  },
});
