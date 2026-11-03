import { apiErrorMessage, makeApiClient } from '@vornway/api-client';
import { Platform } from 'react-native';
import { API_URL, authClient } from './auth-client';

export const api = makeApiClient({
  baseUrl: API_URL,
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
