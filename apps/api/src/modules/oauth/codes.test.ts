import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { Effect } from 'effect';
import { AuthorizationCodes, verifyPkce } from './codes';

const GRANT = {
  clientId: 'mcp_1',
  redirectUri: 'https://claude.ai/callback',
  scope: 'mcp:tools',
  resource: 'https://api.vornway.com/mcp',
  user: { id: 'user_1', email: 'ana@gmail.com', name: 'Ana' },
};

describe('AuthorizationCodes', () => {
  it('hands a code out once', async () => {
    const [first, second] = await Effect.runPromise(
      Effect.gen(function* () {
        const codes = yield* AuthorizationCodes;
        const code = yield* codes.create(GRANT);
        return [yield* codes.consume(code), yield* codes.consume(code)];
      }).pipe(Effect.provide(AuthorizationCodes.layer)),
    );

    expect(first).toEqual(GRANT);
    expect(second).toBeNull();
  });

  it('does not know unissued codes', async () => {
    const result = await Effect.runPromise(
      Effect.flatMap(AuthorizationCodes, (codes) => codes.consume('nope')).pipe(
        Effect.provide(AuthorizationCodes.layer),
      ),
    );

    expect(result).toBeNull();
  });
});

describe('verifyPkce', () => {
  const verifier = 'a-code-verifier-that-is-long-enough-to-be-valid';
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  it('passes when the grant carries no challenge', () => {
    expect(verifyPkce(undefined, undefined, undefined)).toBe(true);
  });

  it('requires the verifier when there is a challenge', () => {
    expect(verifyPkce(undefined, challenge, 'S256')).toBe(false);
  });

  it('checks S256 challenges', () => {
    expect(verifyPkce(verifier, challenge, 'S256')).toBe(true);
    expect(verifyPkce('another-verifier', challenge, 'S256')).toBe(false);
  });

  it('compares plain challenges directly, which is also the default', () => {
    expect(
      verifyPkce('plain-challenge-value', 'plain-challenge-value', 'plain'),
    ).toBe(true);
    expect(
      verifyPkce('plain-challenge-value', 'plain-challenge-value', undefined),
    ).toBe(true);
    expect(verifyPkce('other', 'plain-challenge-value', 'plain')).toBe(false);
  });
});
