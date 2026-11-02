import { describe, expect, it } from 'bun:test';
import { makeApiClient } from './client.ts';

describe('makeApiClient', () => {
  it('creates query keys for contract groups and endpoints', () => {
    const api = makeApiClient({ baseUrl: 'http://localhost:3000' });
    expect(api.users.search.key()).toEqual(['api', 'users', 'search']);
    expect(
      api.users.search.queryOptions({ query: { query: 'sam' } }).queryKey,
    ).toEqual(['api', 'users', 'search', { query: { query: 'sam' } }]);
  });
});
