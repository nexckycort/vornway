import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

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

    // Guardar datos del usuario anónimo antes de iniciar sesión
    const previousUserId = session.data.userId;
    const wasAnonymous = session.data.isAnonymous === true;

    try {
      const { user } = await auth.api.signInEmailOTP({
        body: {
          email: normalizedEmail,
          otp,
        },
      });

      // Transferir membresías de grupo si venía de un usuario anónimo
      if (wasAnonymous && previousUserId && previousUserId !== user.id) {
        await db.groupMember.updateMany({
          where: { userId: previousUserId },
          data: { userId: user.id },
        });

        // Eliminar el usuario anónimo
        try {
          await db.session.deleteMany({ where: { userId: previousUserId } });
          await db.account.deleteMany({ where: { userId: previousUserId } });
          await db.user.delete({ where: { id: previousUserId } });
        } catch (e) {
          console.error('Error cleaning up anonymous user:', e);
        }
      }

      await session.update({
        userId: user.id,
        email: user.email,
        name: user.name,
        isAnonymous: false,
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
      isAnonymous: session.data.isAnonymous ?? false,
    };
  },
);

export const syncGoogleSessionFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const session = await useAppSession();
    const previousUserId = session.data.userId;
    const wasAnonymous = session.data.isAnonymous === true;

    const betterAuthSession = await auth.api.getSession({
      headers: new Headers(getRequestHeaders()),
    });

    if (!betterAuthSession?.user) {
      return {
        success: false,
        error: 'No se encontró una sesión activa de Google.',
      };
    }

    const user = betterAuthSession.user;

    // Transferir membresías de grupo si venía de un usuario anónimo
    if (wasAnonymous && previousUserId && previousUserId !== user.id) {
      await db.groupMember.updateMany({
        where: { userId: previousUserId },
        data: { userId: user.id },
      });

      // Eliminar el usuario anónimo
      try {
        await db.session.deleteMany({ where: { userId: previousUserId } });
        await db.account.deleteMany({ where: { userId: previousUserId } });
        await db.user.delete({ where: { id: previousUserId } });
      } catch (e) {
        console.error('Error cleaning up anonymous user:', e);
      }
    }

    await session.update({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAnonymous: false,
    });

    return {
      success: true,
    };
  },
);
