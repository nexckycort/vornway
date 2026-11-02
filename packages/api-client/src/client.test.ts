import { describe, expect, it } from 'bun:test';
import {
  ApiDefect,
  apiErrorKind,
  apiErrorMessage,
  makeApiClient,
} from './client.ts';

type PagedEndpoint = {
  infiniteQueryOptions(): {
    getNextPageParam(page: {
      pagination: { nextCursor: string | null };
    }): string | undefined;
  };
};

describe('makeApiClient', () => {
  const api = makeApiClient({ baseUrl: 'http://localhost:3000' });

  it('creates query keys for contract groups and endpoints', () => {
    expect(api.users.search.key()).toEqual(['api', 'users', 'search']);
    expect(
      api.users.search.queryOptions({ query: { query: 'sam' } }).queryKey,
    ).toEqual(['api', 'users', 'search', { query: { query: 'sam' } }]);
  });

  it('reads the next page cursor from the pagination envelope', () => {
    const { getNextPageParam } = (
      api.users.search as unknown as PagedEndpoint
    ).infiniteQueryOptions();

    expect(getNextPageParam({ pagination: { nextCursor: 'cursor-2' } })).toBe(
      'cursor-2',
    );
    expect(getNextPageParam({ pagination: { nextCursor: null } })).toBe(
      undefined,
    );
  });
});

describe('apiErrorMessage', () => {
  it('prefers the error field, then the message field', () => {
    expect(
      apiErrorMessage(
        { _tag: 'GroupNotFound', error: 'Grupo no encontrado' },
        'x',
      ),
    ).toBe('Grupo no encontrado');
    expect(
      apiErrorMessage(
        { _tag: 'UserNotFound', message: 'Usuario no encontrado' },
        'x',
      ),
    ).toBe('Usuario no encontrado');
  });

  it('falls back for transport failures and unknown values', () => {
    expect(apiErrorMessage(new ApiDefect({ cause: 'boom' }), 'fallback')).toBe(
      'fallback',
    );
    expect(
      apiErrorMessage(
        { _tag: 'HttpClientError', message: 'Transport error' },
        'fallback',
      ),
    ).toBe('fallback');
    expect(apiErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(
      apiErrorMessage({ _tag: 'InternalError', traceId: 't' }, 'fallback'),
    ).toBe('fallback');
  });
});

describe('apiErrorKind', () => {
  it('tells refusals, server failures and transport failures apart', () => {
    expect(apiErrorKind({ _tag: 'GroupNotFound', error: 'x' })).toBe(
      'rejected',
    );
    expect(apiErrorKind({ _tag: 'InvalidRequest', message: 'x' })).toBe(
      'rejected',
    );
    expect(apiErrorKind({ _tag: 'InternalError', traceId: 't' })).toBe(
      'server',
    );
    expect(apiErrorKind({ _tag: 'AuthUnavailable' })).toBe('server');
    expect(apiErrorKind({ _tag: 'SchemaError' })).toBe('rejected');
    expect(apiErrorKind({ _tag: 'HttpClientError' })).toBe('network');
    expect(apiErrorKind(new ApiDefect({ cause: 'boom' }))).toBe('network');
    expect(apiErrorKind(new Error('REQUEST_TIMEOUT'))).toBe('network');
  });
});
