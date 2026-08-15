import { Platform } from 'react-native';

import { authClient } from '@/lib/auth-client';

export const fetchWithCredentials: typeof fetch = (input, init) => {
  const headers = new Headers(init?.headers);
  // Web cookies are managed by the browser. Native clients need the cookie
  // read from SecureStore and attached explicitly.
  const cookie = Platform.OS === 'web' ? undefined : authClient.getCookie();

  if (cookie) {
    headers.set('Cookie', cookie);
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: Platform.OS === 'web' ? 'include' : 'omit',
  });
};
