import { BunCrypto } from '@effect/platform-bun';
import { Crypto, Effect } from 'effect';

export const randomId = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto;
  return yield* crypto.randomUUIDv4();
}).pipe(Effect.orDie, Effect.provide(BunCrypto.layer));
