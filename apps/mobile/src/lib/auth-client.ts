import { expoClient } from '@better-auth/expo/client';
import type { BetterAuthClientPlugin } from 'better-auth';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.vornway.com';

// @better-auth/expo and better-auth can resolve separate copies of
// @better-auth/core in isolated workspace installs. Their runtime contract is
// compatible, but TypeScript sees the duplicated generic types as distinct.
const expoAuthPlugin = expoClient({
  scheme: 'vornway',
  storagePrefix: 'vornway',
  storage: SecureStore,
  // SecureStore's synchronous native API is unavailable in Expo web.
  // The browser keeps the session in its regular cookie jar instead.
  disableCache: Platform.OS === 'web',
}) as unknown as BetterAuthClientPlugin;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoAuthPlugin],
});

export const getAuthCallbackURL = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : '/';
