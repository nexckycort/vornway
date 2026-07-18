import { createHash, randomUUID } from 'node:crypto';
import type { LoginUser } from '../auth/types';

const AUTH_CODE_TTL_MS = 5 * 60 * 1000;

type AuthorizationCodeRecord = {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  resource: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'plain' | 'S256';
  user: LoginUser;
  expiresAt: number;
};

const codeStore = new Map<string, AuthorizationCodeRecord>();

function nowMs(): number {
  return Date.now();
}

function cleanupExpired(): void {
  const now = nowMs();

  codeStore.forEach((record, code) => {
    if (record.expiresAt <= now) {
      codeStore.delete(code);
    }
  });
}

export function createAuthorizationCode(
  input: Omit<AuthorizationCodeRecord, 'code' | 'expiresAt'>,
): string {
  cleanupExpired();

  const code = randomUUID().replace(/-/g, '');

  codeStore.set(code, {
    ...input,
    code,
    expiresAt: nowMs() + AUTH_CODE_TTL_MS,
  });

  return code;
}

export function consumeAuthorizationCode(
  code: string,
): AuthorizationCodeRecord | null {
  cleanupExpired();

  const record = codeStore.get(code);
  if (!record) {
    return null;
  }

  codeStore.delete(code);
  return record.expiresAt > nowMs() ? record : null;
}

function toBase64Url(input: Buffer): string {
  return input.toString('base64url');
}

export function verifyPkce(
  codeVerifier: string | undefined,
  codeChallenge: string | undefined,
  codeChallengeMethod: 'plain' | 'S256' | undefined,
): boolean {
  if (!codeChallenge) {
    return true;
  }

  if (!codeVerifier) {
    return false;
  }

  if (!codeChallengeMethod || codeChallengeMethod === 'plain') {
    return codeVerifier === codeChallenge;
  }

  const digest = createHash('sha256').update(codeVerifier).digest();
  return toBase64Url(digest) === codeChallenge;
}
