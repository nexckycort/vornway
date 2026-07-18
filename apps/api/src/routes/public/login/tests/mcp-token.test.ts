import { describe, expect, it } from 'bun:test';
import {
  createMcpAccessToken,
  extractBearerToken,
  verifyMcpAccessToken,
} from '../mcp/token';

const TEST_SECRET = 'test-mcp-secret';

describe('mcp access token', () => {
  it('creates and verifies token', () => {
    const now = 1_700_000_000;

    const token = createMcpAccessToken(
      {
        id: 'user_1',
        email: 'user@gmail.com',
        name: 'User',
      },
      now,
      TEST_SECRET,
    );

    const user = verifyMcpAccessToken(token.accessToken, now + 10, TEST_SECRET);

    expect(user).toEqual({
      id: 'user_1',
      email: 'user@gmail.com',
      name: 'User',
    });
  });

  it('rejects expired token', () => {
    const now = 1_700_000_000;

    const token = createMcpAccessToken(
      {
        id: 'user_1',
        email: 'user@gmail.com',
        name: 'User',
      },
      now,
      TEST_SECRET,
    );

    const user = verifyMcpAccessToken(
      token.accessToken,
      now + token.expiresIn + 1,
      TEST_SECRET,
    );

    expect(user).toBeNull();
  });

  it('extracts bearer token', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
    expect(extractBearerToken('Basic abc123')).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
  });
});
