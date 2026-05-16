import { API_URL } from '#/config/env';
import { createAuthedClient, createPublicClient } from '@vornway/api/hc';

export type { InferRequestType, InferResponseType } from '@vornway/api/hc';

export const publicClient = createPublicClient(API_URL, {
  fetch: ((input, init) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
  }) satisfies typeof fetch,
});

export const client = createAuthedClient(API_URL, {
  fetch: (async (input, init) => {
    const res = await fetch(input, {
      ...init,
      credentials: 'include',
    });

    if (!res.ok) {
      // TODO: errores globales
      console.error('API request failed');
    }

    return res;
  }) satisfies typeof fetch,
});
