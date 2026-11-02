import { createHash } from 'node:crypto';
import { Clock, Context, Effect, Layer } from 'effect';
import type { McpUser } from '../mcp/token';

const CODE_TTL_MS = 5 * 60 * 1000;

export type CodeChallengeMethod = 'plain' | 'S256';

export type AuthorizationGrant = {
  readonly clientId: string;
  readonly redirectUri: string;
  readonly scope: string;
  readonly resource: string;
  readonly codeChallenge?: string | undefined;
  readonly codeChallengeMethod?: CodeChallengeMethod | undefined;
  readonly user: McpUser;
};

export class AuthorizationCodes extends Context.Service<
  AuthorizationCodes,
  {
    create(grant: AuthorizationGrant): Effect.Effect<string>;
    consume(code: string): Effect.Effect<AuthorizationGrant | null>;
  }
>()('vornway/oauth/AuthorizationCodes') {
  static readonly layer = Layer.sync(AuthorizationCodes, () => {
    const issued = new Map<
      string,
      { readonly grant: AuthorizationGrant; readonly expiresAt: number }
    >();

    const dropExpired = (now: number) => {
      for (const [code, entry] of issued) {
        if (entry.expiresAt <= now) issued.delete(code);
      }
    };

    return AuthorizationCodes.of({
      create: Effect.fn('AuthorizationCodes.create')(function* (grant) {
        const now = yield* Clock.currentTimeMillis;
        dropExpired(now);
        const code = crypto.randomUUID().replaceAll('-', '');
        issued.set(code, { grant, expiresAt: now + CODE_TTL_MS });
        return code;
      }),
      consume: Effect.fn('AuthorizationCodes.consume')(function* (code) {
        const now = yield* Clock.currentTimeMillis;
        dropExpired(now);
        const entry = issued.get(code);
        issued.delete(code);
        return entry?.grant ?? null;
      }),
    });
  });
}

export const verifyPkce = (
  codeVerifier: string | undefined,
  codeChallenge: string | undefined,
  method: CodeChallengeMethod | undefined,
) => {
  if (!codeChallenge) return true;
  if (!codeVerifier) return false;
  if (!method || method === 'plain') return codeVerifier === codeChallenge;

  return (
    createHash('sha256').update(codeVerifier).digest('base64url') ===
    codeChallenge
  );
};
