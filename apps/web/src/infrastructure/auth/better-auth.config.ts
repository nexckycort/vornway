import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { anonymous, emailOTP } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

import { serverEnv } from '~/config/env.server';
import { db } from '~/infrastructure/database/connection';
import { resend } from '~/infrastructure/email/resend.config';

const TEN_YEARS_IN_SECONDS = 60 * 60 * 24 * 365 * 10;

const authConfig = {
  baseURL: serverEnv.BETTER_AUTH_URL,
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  session: {
    expiresIn: TEN_YEARS_IN_SECONDS,
    updateAge: 60 * 60 * 24,
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    },
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
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // Transferir membresías de grupo del usuario anónimo al nuevo usuario
        await db.groupMember.updateMany({
          where: { userId: anonymousUser.user.id },
          data: { userId: newUser.user.id },
        });
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authConfig) as ReturnType<
  typeof betterAuth<typeof authConfig>
>;
