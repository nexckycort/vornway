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
}) as unknown as BetterAuthClientPlugin;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [expoAuthPlugin],
});
