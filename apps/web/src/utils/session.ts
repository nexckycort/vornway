import { useSession } from '@tanstack/react-start/server';

import { serverEnv } from '~/config/env.server';

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

type SessionData = {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  isAnonymous?: boolean;
};

export function useAppSession() {
  return useSession<SessionData>({
    name: 'app-session',
    password: serverEnv.BETTER_AUTH_SECRET, // At least 32 characters
    cookie: {
      secure: serverEnv.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
      maxAge: ONE_YEAR_IN_SECONDS,
    },
  });
}
