import { describe, expect, it } from 'bun:test';
import { Api } from './api.ts';

describe('Api', () => {
  it('includes users endpoints', () => {
    expect(Object.keys(Api.groups.users.endpoints)).toEqual([
      'search',
      'username',
      'image',
    ]);
  });
});
