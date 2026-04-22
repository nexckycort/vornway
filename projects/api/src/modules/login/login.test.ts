import { describe, expect, it } from 'bun:test';
import { validateEmail } from './validators';

describe('login validators', () => {
  it('accepts allowed domains', () => {
    expect(validateEmail('user@gmail.com')).toBe(true);
    expect(validateEmail('user@proton.me')).toBe(true);
  });

  it('rejects disallowed domains', () => {
    expect(validateEmail('user@empresa.com')).toBe(false);
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
