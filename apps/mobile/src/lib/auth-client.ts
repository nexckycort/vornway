import { expoClient } from '@better-auth/expo/client';
import type { BetterAuthClientPlugin } from 'better-auth';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { env } from '@/config/env';

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
  baseURL: env.apiUrl,
  plugins: [expoAuthPlugin, emailOTPClient()],
});

export const getAuthCallbackURL = () =>
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : '/';
