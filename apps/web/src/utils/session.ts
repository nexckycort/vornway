import { useSession } from '@tanstack/react-start/server';

import { serverEnv } from '~/config/env.server';

type SessionData = {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
};

export function useAppSession() {
  return useSession<SessionData>({
    name: 'app-session',
    password: serverEnv.BETTER_AUTH_SECRET, // At least 32 characters
    cookie: {
      secure: serverEnv.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  });
}
