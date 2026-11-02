import { describe, expect, it } from 'bun:test';
import { makeApiClient } from './client.ts';

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
