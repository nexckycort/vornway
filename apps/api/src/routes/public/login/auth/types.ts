export const allowedLoginDomains = [
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
] as const;

export type SendOtpInput = {
  email: string;
  name?: string;
};

export type VerifyOtpInput = {
  email: string;
  otp: string;
  previousUserId?: string;
  wasAnonymous?: boolean;
};

export type SyncGoogleInput = {
  headers: Headers;
  previousUserId?: string;
  wasAnonymous?: boolean;
};

export type LoginUser = {
  id: string;
  email: string;
  name: string | null;
  isAnonymous?: boolean;
};

export type SendOtpResult = {
  code:
    | 'OTP_SENT'
    | 'INVALID_DOMAIN'
    | 'USER_ALREADY_EXISTS'
    | 'USER_NOT_FOUND';
  message: string;
};

export type VerifyOtpResult =
  | {
      success: true;
      user: LoginUser;
    }
  | {
      success: false;
      error: string;
    };

export type SyncGoogleResult =
  | {
      success: true;
      user: LoginUser;
    }
  | {
      success: false;
      error: string;
    };
