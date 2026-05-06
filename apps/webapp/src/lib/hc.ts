import { API_URL } from '#/config/env';
import { createPublicClient } from '@vornway/api/hc';

export type { InferRequestType, InferResponseType } from '@vornway/api/hc';

export const publicClient = createPublicClient(API_URL, {
  fetch: ((input, init) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
    // @ts-expect-error
  }) satisfies typeof fetch,
});
