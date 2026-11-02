import { expect } from 'bun:test';
import { Effect } from 'effect';
import { type Device, makeTestApp } from '../../../testkit/app';
import { signIn } from '../../../testkit/login';

export type Participant = {
  id: string;
  userId: string | null;
  name: string;
  role: string;
  clientId?: string;
};

export const setup = Effect.gen(function* () {
  const app = yield* makeTestApp();
  const ana = yield* signIn(app, 'ana@vornway.test');
  const bruno = yield* signIn(app, 'bruno@vornway.test');
  const carla = yield* signIn(app, 'carla@vornway.test');
  return { app, ana, bruno, carla };
});

export const createSplit = (
  device: Device,
  participants: object[],
  extra: object = {},
) =>
  Effect.gen(function* () {
    const response = yield* device.post('/api/quick-splits', {
      name: 'Trip',
      participants,
      ...extra,
    });
    expect(response.status).toBe(201);
    return {
      id: response.body.id as string,
      participants: response.body.participants as Participant[],
    };
  });

export const addExpense = (
  device: Device,
  quickSplitId: string,
  expense: object = {},
) =>
  device.post(`/api/quick-splits/${quickSplitId}/expenses`, {
    description: 'Dinner',
    amount: 90,
    currency: 'cop',
    ...expense,
  });

export const withExpense = (expense: object = {}) =>
  Effect.gen(function* () {
    const { app, ana, bruno, carla } = yield* setup;
    const split = yield* createSplit(ana.device, [
      { userId: bruno.id, name: 'Bruno' },
    ]);
    const created = yield* addExpense(ana.device, split.id, expense);
    expect(created.status).toBe(201);
    return {
      app,
      ana,
      bruno,
      carla,
      split,
      expenseId: created.body.id as string,
    };
  });
