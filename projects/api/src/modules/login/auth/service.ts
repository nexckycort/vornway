import { auth } from '~/infrastructure/auth/better-auth.config';
import { db } from '~/infrastructure/database/connection';
import type {
  LoginUser,
  SendOtpInput,
  SendOtpResult,
  SyncGoogleInput,
  SyncGoogleResult,
  VerifyOtpInput,
  VerifyOtpResult,
} from './types';
import { validateEmail } from './validators';

type LoginAuthApi = {
  signUpEmail: (input: {
    body: { email: string; name: string; password: string };
  }) => Promise<unknown>;
  sendVerificationOTP: (input: {
    body: { email: string; type: 'sign-in' };
  }) => Promise<unknown>;
  signInEmailOTP: (input: {
    body: { email: string; otp: string };
  }) => Promise<{ user: LoginUser }>;
  getSession: (input: {
    headers: Headers;
  }) => Promise<{ user: LoginUser } | null>;
};

type LoginDb = {
  user: {
    findUnique: typeof db.user.findUnique;
    delete: typeof db.user.delete;
  };
  groupMember: {
    updateMany: typeof db.groupMember.updateMany;
  };
  session: {
    deleteMany: typeof db.session.deleteMany;
  };
  account: {
    deleteMany: typeof db.account.deleteMany;
  };
};

export type LoginServiceDeps = {
  authApi?: LoginAuthApi;
  database?: LoginDb;
};

export type LoginService = {
  sendOtp: (input: SendOtpInput) => Promise<SendOtpResult>;
  verifyOtp: (input: VerifyOtpInput) => Promise<VerifyOtpResult>;
  syncGoogleSession: (input: SyncGoogleInput) => Promise<SyncGoogleResult>;
  getCurrentUser: (headers: Headers) => Promise<LoginUser | null>;
};

function generateRandomPassword(length: number = 10): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function transferAndCleanupAnonymousUser(
  database: LoginDb,
  previousUserId: string,
  newUserId: string,
): Promise<void> {
  await database.groupMember.updateMany({
    where: { userId: previousUserId },
    data: { userId: newUserId },
  });

  try {
    await database.session.deleteMany({ where: { userId: previousUserId } });
    await database.account.deleteMany({ where: { userId: previousUserId } });
    await database.user.delete({ where: { id: previousUserId } });
  } catch (error) {
    console.error('Error cleaning up anonymous user:', error);
  }
}

export function createLoginService(deps: LoginServiceDeps = {}): LoginService {
  const authApi = deps.authApi ?? (auth.api as unknown as LoginAuthApi);
  const database = deps.database ?? db;

  return {
    sendOtp: async ({ email, name }) => {
      const normalizedEmail = email.toLowerCase().trim();

      if (!validateEmail(normalizedEmail)) {
        return {
          code: 'INVALID_DOMAIN',
          message: 'Usa un correo de Gmail, Outlook, Yahoo o iCloud',
        };
      }

      if (name) {
        const existingUser = await database.user.findUnique({
          select: { id: true },
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          return {
            code: 'USER_ALREADY_EXISTS',
            message: 'El usuario ya existe',
          };
        }

        await authApi.signUpEmail({
          body: {
            email: normalizedEmail,
            name,
            password: generateRandomPassword(),
          },
        });
      } else {
        const existingUser = await database.user.findUnique({
          select: { id: true },
          where: { email: normalizedEmail },
        });

        if (!existingUser) {
          return {
            code: 'USER_NOT_FOUND',
            message: 'Usuario no encontrado',
          };
        }
      }

      await authApi.sendVerificationOTP({
        body: {
          email: normalizedEmail,
          type: 'sign-in',
        },
      });

      return {
        code: 'OTP_SENT',
        message: 'Código de verificación enviado',
      };
    },

    verifyOtp: async ({ email, otp, previousUserId, wasAnonymous }) => {
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedOtp = otp.replace(/\s+/g, '').trim();

      try {
        const { user } = await authApi.signInEmailOTP({
          body: {
            email: normalizedEmail,
            otp: normalizedOtp,
          },
        });

        if (wasAnonymous && previousUserId && previousUserId !== user.id) {
          await transferAndCleanupAnonymousUser(database, previousUserId, user.id);
        }

        return {
          success: true,
          user,
        };
      } catch (error) {
        console.error('Error during OTP login:', {
          email: normalizedEmail,
          otpLength: normalizedOtp.length,
          error,
        });

        const message =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message ?? '')
            : '';

        return {
          success: false,
          error: message.includes('expired')
            ? 'Código OTP expirado'
            : 'Código OTP incorrecto o expirado',
        };
      }
    },

    syncGoogleSession: async ({ headers, previousUserId, wasAnonymous }) => {
      const session = await authApi.getSession({ headers });

      if (!session?.user) {
        return {
          success: false,
          error: 'No se encontró una sesión activa de Google.',
        };
      }

      const { user } = session;

      if (wasAnonymous && previousUserId && previousUserId !== user.id) {
        await transferAndCleanupAnonymousUser(database, previousUserId, user.id);
      }

      return {
        success: true,
        user,
      };
    },

    getCurrentUser: async (headers) => {
      const session = await authApi.getSession({ headers });
      return session?.user ?? null;
    },
  };
}
