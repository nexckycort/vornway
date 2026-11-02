import { describe, expect, it } from 'bun:test';
import { isAllowedLoginEmail } from './validators';

describe('login validators', () => {
  it('accepts allowed domains', () => {
    expect(isAllowedLoginEmail('user@gmail.com')).toBe(true);
    expect(isAllowedLoginEmail('user@proton.me')).toBe(true);
  });

  it('rejects disallowed domains', () => {
    expect(isAllowedLoginEmail('user@empresa.com')).toBe(false);
    expect(isAllowedLoginEmail('invalid-email')).toBe(false);
  });
});
