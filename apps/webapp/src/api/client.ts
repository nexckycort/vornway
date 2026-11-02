import { apiErrorMessage, makeApiClient } from '@vornway/api-client';
import { API_URL } from '#/config/env';

export const api = makeApiClient({ baseUrl: API_URL });

export const withErrorMessage = <A>(request: Promise<A>, fallback: string) =>
  request.catch((error: unknown) => {
    throw new Error(apiErrorMessage(error, fallback));
  });

export const failWithMessage = <A>(request: Promise<A>, message: string) =>
  request.catch(() => {
    throw new Error(message);
  });
