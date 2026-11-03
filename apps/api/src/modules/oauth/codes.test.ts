import { describe, expect, it } from 'bun:test';
import { BunCrypto } from '@effect/platform-bun';
import { Crypto, Effect, Layer } from 'effect';
import { Base64Url } from 'effect/encoding';
import {
  AuthorizationCodes,
  type CodeChallengeMethod,
  verifyPkce,
} from './codes';

const GRANT = {
  clientId: 'mcp_1',
  redirectUri: 'https://claude.ai/callback',
  scope: 'mcp:tools',
  resource: 'https://api.vornway.com/mcp',
  user: { id: 'user_1', email: 'ana@gmail.com', name: 'Ana' },
};

const codesLayer = AuthorizationCodes.layer.pipe(
  Layer.provide(BunCrypto.layer),
);

describe('AuthorizationCodes', () => {
  it('hands a code out once', async () => {
    const [first, second] = await Effect.runPromise(
      Effect.gen(function* () {
        const codes = yield* AuthorizationCodes;
        const code = yield* codes.create(GRANT);
        return [yield* codes.consume(code), yield* codes.consume(code)];
      }).pipe(Effect.provide(codesLayer)),
    );

    expect(first).toEqual(GRANT);
    expect(second).toBeNull();
  });

  it('does not know unissued codes', async () => {
    const result = await Effect.runPromise(
      Effect.flatMap(AuthorizationCodes, (codes) => codes.consume('nope')).pipe(
        Effect.provide(codesLayer),
      ),
    );

    expect(result).toBeNull();
  });
});

describe('verifyPkce', () => {
  const verifier = 'a-code-verifier-that-is-long-enough-to-be-valid';
  const challenge = Base64Url.encode(
    new Bun.CryptoHasher('sha256').update(verifier).digest(),
  );
  const check = (
    codeVerifier: string | undefined,
    codeChallenge: string | undefined,
    method: CodeChallengeMethod | undefined,
  ) =>
    Effect.runPromise(
      Effect.flatMap(Crypto.Crypto, (crypto) =>
        verifyPkce(crypto, codeVerifier, codeChallenge, method),
      ).pipe(Effect.provide(BunCrypto.layer)),
    );

  it('passes when the grant carries no challenge', async () => {
    expect(await check(undefined, undefined, undefined)).toBe(true);
  });

  it('requires the verifier when there is a challenge', async () => {
    expect(await check(undefined, challenge, 'S256')).toBe(false);
  });

  it('checks S256 challenges', async () => {
    expect(await check(verifier, challenge, 'S256')).toBe(true);
    expect(await check('another-verifier', challenge, 'S256')).toBe(false);
  });

  it('compares plain challenges directly, which is also the default', async () => {
    expect(
      await check('plain-challenge-value', 'plain-challenge-value', 'plain'),
    ).toBe(true);
    expect(
      await check('plain-challenge-value', 'plain-challenge-value', undefined),
    ).toBe(true);
    expect(await check('other', 'plain-challenge-value', 'plain')).toBe(false);
  });
});
