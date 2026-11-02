import { expo } from '@better-auth/expo';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { anonymous, emailOTP } from 'better-auth/plugins';
import type { PrismaClient } from '#/generated/prisma/client';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

type AuthDependencies = {
  readonly db: PrismaClient;
  readonly baseURL: string;
  readonly secret: string;
  readonly development: boolean;
  readonly google: { readonly clientId: string; readonly clientSecret: string };
  readonly sendVerificationOtp: (data: {
    email: string;
    otp: string;
  }) => Promise<void>;
};

export const makeAuth = (deps: AuthDependencies) => {
  const authConfig = {
    baseURL: deps.baseURL,
    secret: deps.secret,
    trustedOrigins: [
      'https://app.vornway.com',
      'vornway://',
      ...(deps.development
        ? [
            'https://app.dev.vornway.com',
            'exp://',
            'exp://**',
            'exp://192.168.*.*:*/**',
          ]
        : []),
    ],
    database: prismaAdapter(deps.db, {
      provider: 'postgresql',
    }),
    user: {
      additionalFields: {
        username: {
          type: 'string',
          required: false,
          input: false,
        },
      },
    },
    session: {
      expiresIn: ONE_YEAR_IN_SECONDS,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: deps.google,
    },
    plugins: [
      expo(),
      emailOTP({
        sendVerificationOTP: (data) => deps.sendVerificationOtp(data),
      }),
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          // Transferir membresías de grupo del usuario anónimo al nuevo usuario
          await deps.db.groupMember.updateMany({
            where: { userId: anonymousUser.user.id },
            data: { userId: newUser.user.id },
          });
        },
      }),
    ],
  } satisfies BetterAuthOptions;

  return betterAuth(authConfig) as ReturnType<
    typeof betterAuth<typeof authConfig>
  >;
};

export type BetterAuth = ReturnType<typeof makeAuth>;
