import { createAuthClient } from 'better-auth/react';

import { API_URL } from '#/config/env';

export const authClient = createAuthClient({
  baseURL: API_URL,
});

export const { useSession, signIn, signOut, listSessions, revokeSession } =
  authClient;

export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
