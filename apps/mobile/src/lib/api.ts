import { apiErrorMessage, makeApiClient } from '@vornway/api-client';
import { Platform } from 'react-native';
import { env } from '@/config/env';
import { authClient } from './auth-client';

export const api = makeApiClient({
  baseUrl: env.apiUrl,
  headers: async () => {
    // The browser sends web cookies itself; native reads them from SecureStore.
    const cookie = Platform.OS === 'web' ? null : authClient.getCookie();
    return cookie ? { cookie } : undefined;
  },
});

export const withErrorMessage = <A>(request: Promise<A>, fallback: string) =>
  request.catch((error: unknown) => {
    throw new Error(apiErrorMessage(error, fallback));
  });
