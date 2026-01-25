import { createServerFn } from '@tanstack/react-start';

import { auth } from '~/infrastructure/auth/better-auth.config';
import { db } from '~/infrastructure/database/connection';
import { useAppSession } from '~/utils/session';

function generateRandomPassword(length: number = 10): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const allowedDomains = [
  'gmail.com',
  'outlook.com',
  'outlook.es',
  'hotmail.com',
  'hotmail.es',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'live.com',
  'msn.com',
  'protonmail.com',
  'proton.me',
];

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  const domain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(domain);
};

export const sendOtp = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; name?: string }) => data)
  .handler(async ({ data: { email, name } }) => {
    const normalizedEmail = email.toLowerCase().trim();

    if (!validateEmail(normalizedEmail)) {
      return {
        code: 'INVALID_DOMAIN',
      };
    }

    if (name) {
      const existingUser = await db.user.findUnique({
        select: { id: true },
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return {
          message: 'El usuario ya existe',
          code: 'USER_ALREADY_EXISTS',
        };
      }

      const password = generateRandomPassword();
      await auth.api.signUpEmail({
        body: {
          email: normalizedEmail,
          name: name,
          password,
        },
      });
    } else {
      const existingUser = await db.user.findUnique({
        select: { id: true, name: true },
        where: { email: normalizedEmail },
      });

      if (!existingUser) {
        return {
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND',
        };
      }
    }

    await auth.api.sendVerificationOTP({
      body: {
        email: normalizedEmail,
        type: 'sign-in',
      },
    });

    return {
      message: 'Código de verificación enviado',
      code: 'OTP_SENT',
    };
  });

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; otp: string }) => data)
  .handler(async ({ data: { email, otp } }) => {
    const normalizedEmail = email.toLowerCase().trim();
    const session = await useAppSession();

    try {
      const { user } = await auth.api.signInEmailOTP({
        body: {
          email: normalizedEmail,
          otp,
        },
      });

      await session.update({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      console.error('Error during OTP login:', error);
      return {
        success: false,
        error: 'Código OTP incorrecto o expirado',
      };
    }
  });

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await useAppSession();
  await session.clear();
  return { success: true };
});

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useAppSession();
    const userId = session.data.userId;

    if (!userId) {
      return null;
    }

    return {
      id: userId,
      email: session.data.email,
      name: session.data.name,
    };
  },
);
