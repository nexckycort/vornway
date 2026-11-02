import { describe, expect, it } from 'bun:test';
import {
  bearerToken,
  createMcpAccessToken,
  verifyMcpAccessToken,
} from './token';

const SECRET = 'test-mcp-secret';
const NOW = 1_700_000_000;
const USER = { id: 'user_1', email: 'user@gmail.com', name: 'User' };

describe('mcp access token', () => {
  it('creates and verifies token', () => {
    const token = createMcpAccessToken(USER, NOW, SECRET);

    expect(verifyMcpAccessToken(token.accessToken, NOW + 10, SECRET)).toEqual(
      USER,
    );
  });

  it('rejects expired token', () => {
    const token = createMcpAccessToken(USER, NOW, SECRET);

    expect(
      verifyMcpAccessToken(
        token.accessToken,
        NOW + token.expiresIn + 1,
        SECRET,
      ),
    ).toBeNull();
  });

  it('rejects a token signed with another secret or tampered with', () => {
    const token = createMcpAccessToken(USER, NOW, SECRET);
    const [header, , signature] = token.accessToken.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...USER, sub: 'user_2', iat: NOW, exp: NOW + 100 }),
    ).toString('base64url');

    expect(verifyMcpAccessToken(token.accessToken, NOW, 'other')).toBeNull();
    expect(
      verifyMcpAccessToken(`${header}.${forged}.${signature}`, NOW, SECRET),
    ).toBeNull();
    expect(verifyMcpAccessToken('not-a-token', NOW, SECRET)).toBeNull();
  });

  it('extracts bearer token', () => {
    expect(bearerToken('Bearer abc123')).toBe('abc123');
    expect(bearerToken('Basic abc123')).toBeNull();
    expect(bearerToken('Bearer   ')).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
  });
});
