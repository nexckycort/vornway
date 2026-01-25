import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { emailOTP } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

import { serverEnv } from '~/config/env.server';
import { db } from '~/infrastructure/database/connection';
import { resend } from '~/infrastructure/email/resend.config';

const authConfig = {
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP(data) {
        console.log(data.email, data.otp);
        if (serverEnv.NODE_ENV === 'production') {
          await resend.emails.send({
            // TODO: switch to new email service
            from: 'noreply@flygens.com',
            to: data.email,
            subject: 'Código de verificación',
            html: `
    <p>Hola,</p>
    <p>Tu código de verificación es: <strong>${data.otp}</strong></p>
    <p>Si no solicitaste este código, por favor ignora este mensaje.</p>
    <p>Saludos,</p>
    <p>El equipo de Splitway</p>
  `,
          });
        }
      },
    }),
    tanstackStartCookies(),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authConfig) as ReturnType<
  typeof betterAuth<typeof authConfig>
>;
