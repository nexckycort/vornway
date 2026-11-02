import { Effect } from 'effect';
import { type Device, makeTestApp } from '../../../testkit/app';
import { signIn } from '../../../testkit/login';

export const twoUsers = Effect.gen(function* () {
  const app = yield* makeTestApp();
  const ana = yield* signIn(app, 'ana@vornway.test');
  const bruno = yield* signIn(app, 'bruno@vornway.test');
  return { app, ana, bruno };
});

export const createAccount = Effect.fn('createAccount')(function* (
  device: Device,
  overrides: object = {},
) {
  const response = yield* device.post('/api/finances/accounts', {
    name: 'Wallet',
    type: 'cash',
    currentBalance: 100,
    ...overrides,
  });
  return { ...response, id: response.body.id as string };
});

export const balanceOf = Effect.fn('balanceOf')(function* (
  device: Device,
  accountId: string,
) {
  const response = yield* device.get(`/api/finances/accounts/${accountId}`);
  return {
    current: response.body.currentBalance,
    available: response.body.availableBalance,
    used: response.body.usedCredit,
  };
});

export const asList = (body: unknown) => body as unknown[];
