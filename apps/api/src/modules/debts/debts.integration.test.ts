import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import type { Device } from '../../../testkit/app';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { asList } from '../finances/testing';

const threeUsers = Effect.gen(function* () {
  const app = yield* makeTestApp();
  const ana = yield* signIn(app, 'ana@vornway.test');
  const bruno = yield* signIn(app, 'bruno@vornway.test');
  const carla = yield* signIn(app, 'carla@vornway.test');
  return { app, ana, bruno, carla };
});

const createDebt = Effect.fn('createDebt')(function* (
  device: Device,
  overrides: object = {},
) {
  const response = yield* device.post('/api/debts', {
    name: 'Trip',
    counterpartyName: 'Carlos',
    direction: 'lent',
    principalAmount: 100,
    currency: 'cop',
    ...overrides,
  });
  return { ...response, id: response.body.id as string };
});

const createAccount = Effect.fn('createAccount')(function* (
  device: Device,
  overrides: object = {},
) {
  const response = yield* device.post('/api/finances/accounts', {
    name: 'Wallet',
    type: 'cash',
    currentBalance: 1000,
    ...overrides,
  });
  return response.body.id as string;
});

const balance = Effect.fn('balance')(function* (
  device: Device,
  accountId: string,
) {
  return (yield* device.get(`/api/finances/accounts/${accountId}`)).body
    .currentBalance;
});

describe('debts', () => {
  testEffect('require a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      expect((yield* app.fetch('/api/debts')).status).toBe(401);
      expect(
        (yield* app.fetch('/api/debts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })).status,
      ).toBe(401);
    }),
  );

  testEffect('are created, listed, updated and deleted', () =>
    Effect.gen(function* () {
      const { ana } = yield* threeUsers;

      const created = yield* createDebt(ana.device, {
        description: ' for the trip ',
        interestType: 'percentage',
        interestValue: 10,
        dueDate: '2099-01-01T00:00:00.000Z',
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        ownerId: ana.id,
        name: 'Trip',
        currency: 'COP',
        direction: 'lent',
        principalAmount: 100,
        expectedTotal: 110,
        interestType: 'percentage',
        description: 'for the trip',
        viewerRole: 'owner',
        paidAmount: 0,
        remainingAmount: 110,
        status: 'active',
        payments: [],
        amounts: [{ amount: 100, account: null }],
      });

      const read = yield* ana.device.get(`/api/debts/${created.id}`);
      const list = yield* ana.device.get('/api/debts');
      expect(read.body.id).toBe(created.id);
      expect(asList(list.body)).toEqual([
        expect.objectContaining({ id: created.id }),
      ]);

      const updated = yield* ana.device.patch(`/api/debts/${created.id}`, {
        name: 'Renamed',
        interestType: 'fixed',
        interestValue: 5,
      });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({
        name: 'Renamed',
        expectedTotal: 105,
      });

      const keeps = yield* ana.device.patch(`/api/debts/${created.id}`, {
        description: 'again',
      });
      expect(keeps.body).toMatchObject({
        interestType: 'fixed',
        expectedTotal: 105,
      });

      const removed = yield* ana.device.delete(`/api/debts/${created.id}`);
      expect(removed).toEqual({ status: 200, body: { deleted: true } });
      expect(asList((yield* ana.device.get('/api/debts')).body)).toEqual([]);
    }),
  );

  testEffect('filter the list by status and search', () =>
    Effect.gen(function* () {
      const { ana } = yield* threeUsers;
      const paid = yield* createDebt(ana.device, { name: 'Paid one' });
      yield* createDebt(ana.device, {
        name: 'Late one',
        dueDate: '2000-01-01T00:00:00.000Z',
      });
      yield* createDebt(ana.device, {
        name: 'Fresh',
        counterpartyName: 'Zoe',
      });
      yield* ana.device.post(`/api/debts/${paid.id}/payments`, { amount: 100 });
      const names = (path: string) =>
        Effect.map(ana.device.get(path), (response) =>
          (response.body as unknown as { name: string }[])
            .map((debt) => debt.name)
            .sort(),
        );

      expect(yield* names('/api/debts')).toEqual(['Fresh']);
      expect(yield* names('/api/debts?status=paid')).toEqual(['Paid one']);
      expect(yield* names('/api/debts?status=overdue')).toEqual(['Late one']);
      expect(yield* names('/api/debts?status=all')).toHaveLength(3);
      expect(yield* names('/api/debts?status=all&search=ZOE')).toEqual([
        'Fresh',
      ]);
      expect((yield* ana.device.get('/api/debts?status=nope')).status).toBe(
        400,
      );
    }),
  );

  testEffect(
    'are visible to their counterparty but only owned by the owner',
    () =>
      Effect.gen(function* () {
        const { ana, bruno, carla } = yield* threeUsers;
        const debt = yield* createDebt(ana.device, {
          counterpartyId: bruno.id,
        });
        const path = `/api/debts/${debt.id}`;

        const asCounterparty = yield* bruno.device.get(path);
        const counterpartyList = yield* bruno.device.get('/api/debts');
        const asStranger = yield* carla.device.get(path);
        const strangerList = yield* carla.device.get('/api/debts');

        expect(asCounterparty.body).toMatchObject({
          id: debt.id,
          viewerRole: 'counterparty',
        });
        expect(asList(counterpartyList.body)).toHaveLength(1);
        expect(asStranger.status).toBe(404);
        expect(asStranger.body).toEqual({
          _tag: 'DebtNotFound',
          error: 'Debt not found',
        });
        expect(asList(strangerList.body)).toEqual([]);

        for (const user of [bruno, carla]) {
          const responses = [
            yield* user.device.patch(path, { name: 'Hijacked' }),
            yield* user.device.delete(path),
            yield* user.device.post(`${path}/amounts`, {
              amount: 1,
              loanDate: '2026-01-01T00:00:00.000Z',
            }),
            yield* user.device.post(`${path}/payments`, { amount: 1 }),
          ];
          for (const response of responses) expect(response.status).toBe(404);
        }
        expect((yield* ana.device.get(path)).body).toMatchObject({
          name: 'Trip',
        });
      }),
  );

  testEffect('answer the validation and business errors', () =>
    Effect.gen(function* () {
      const { ana, bruno } = yield* threeUsers;
      const foreignAccount = yield* createAccount(bruno.device, {
        currency: 'COP',
      });

      const self = yield* createDebt(ana.device, { counterpartyId: ana.id });
      const missing = yield* createDebt(ana.device, {
        counterpartyId: 'ghost',
      });
      const account = yield* createDebt(ana.device, {
        amounts: [
          {
            amount: 10,
            accountId: foreignAccount,
            loanDate: '2026-01-01T00:00:00.000Z',
          },
        ],
      });
      const invalid = yield* ana.device.post('/api/debts', {
        name: '',
        direction: 'sideways',
      });

      expect(self.status).toBe(400);
      expect(self.body).toMatchObject({ _tag: 'DebtAssignedToSelf' });
      expect(missing.status).toBe(404);
      expect(missing.body).toMatchObject({ _tag: 'DebtCounterpartyNotFound' });
      expect(account.status).toBe(400);
      expect(account.body).toMatchObject({ _tag: 'InvalidFinanceAccount' });
      expect(invalid.status).toBe(400);
      expect(invalid.body._tag).toBe('InvalidRequest');
    }),
  );

  testEffect('move account balances with their amounts and payments', () =>
    Effect.gen(function* () {
      const { ana } = yield* threeUsers;
      const account = yield* createAccount(ana.device, { currency: 'COP' });

      const lent = yield* createDebt(ana.device, {
        principalAmount: 200,
        amounts: [
          {
            amount: 200,
            accountId: account,
            loanDate: '2026-01-01T00:00:00.000Z',
          },
        ],
      });
      expect(lent.body.amounts).toEqual([
        expect.objectContaining({
          account: expect.objectContaining({ id: account, currency: 'COP' }),
        }),
      ]);
      expect(yield* balance(ana.device, account)).toBe(800);

      const payment = yield* ana.device.post(`/api/debts/${lent.id}/payments`, {
        amount: 50,
        accountId: account,
        note: ' first ',
      });
      expect(payment.status).toBe(201);
      expect(payment.body).toMatchObject({
        paidAmount: 50,
        remainingAmount: 150,
        payments: [{ amount: 50, note: 'first' }],
      });
      expect(yield* balance(ana.device, account)).toBe(850);

      const paymentId = (payment.body.payments as { id: string }[])[0]?.id;
      const edited = yield* ana.device.patch(
        `/api/debts/${lent.id}/payments/${paymentId}`,
        { amount: 80 },
      );
      expect(edited.body).toMatchObject({ paidAmount: 80 });
      expect(yield* balance(ana.device, account)).toBe(880);

      const removedPayment = yield* ana.device.delete(
        `/api/debts/${lent.id}/payments/${paymentId}`,
      );
      expect(removedPayment.body).toMatchObject({ paidAmount: 0 });
      expect(yield* balance(ana.device, account)).toBe(800);

      yield* ana.device.delete(`/api/debts/${lent.id}`);
      expect(yield* balance(ana.device, account)).toBe(1000);
    }),
  );

  testEffect('reject payments beyond the remaining balance', () =>
    Effect.gen(function* () {
      const { ana } = yield* threeUsers;
      const debt = yield* createDebt(ana.device, { principalAmount: 100 });

      const tooMuch = yield* ana.device.post(`/api/debts/${debt.id}/payments`, {
        amount: 101,
      });
      const exact = yield* ana.device.post(`/api/debts/${debt.id}/payments`, {
        amount: 100,
      });
      const paymentId = (exact.body.payments as { id: string }[])[0]?.id;
      const editTooMuch = yield* ana.device.patch(
        `/api/debts/${debt.id}/payments/${paymentId}`,
        { amount: 100.5 },
      );

      expect(tooMuch.status).toBe(400);
      expect(tooMuch.body).toEqual({
        _tag: 'DebtPaymentExceedsBalance',
        code: 'DEBT_PAYMENT_EXCEEDS_BALANCE',
        message: 'Payment exceeds remaining balance',
      });
      expect(exact.body).toMatchObject({ status: 'paid' });
      expect(editTooMuch.status).toBe(400);
    }),
  );

  testEffect('keep at least one loan amount', () =>
    Effect.gen(function* () {
      const { ana } = yield* threeUsers;
      const debt = yield* createDebt(ana.device);
      const amountId = (debt.body.amounts as { id: string }[])[0]?.id;

      const added = yield* ana.device.post(`/api/debts/${debt.id}/amounts`, {
        amount: 40,
        loanDate: '2026-02-01T00:00:00.000Z',
      });
      expect(added.status).toBe(201);
      expect(added.body).toMatchObject({
        principalAmount: 140,
        expectedTotal: 140,
      });

      const secondId = (added.body.amounts as { id: string }[]).find(
        (amount) => amount.id !== amountId,
      )?.id;
      const edited = yield* ana.device.patch(
        `/api/debts/${debt.id}/amounts/${secondId}`,
        { amount: 60 },
      );
      expect(edited.body).toMatchObject({ principalAmount: 160 });

      const removed = yield* ana.device.delete(
        `/api/debts/${debt.id}/amounts/${secondId}`,
      );
      expect(removed.body).toMatchObject({ principalAmount: 100 });

      const last = yield* ana.device.delete(
        `/api/debts/${debt.id}/amounts/${amountId}`,
      );
      const unknown = yield* ana.device.delete(
        `/api/debts/${debt.id}/amounts/ghost`,
      );
      expect(last.status).toBe(400);
      expect(last.body).toMatchObject({ _tag: 'DebtAmountRequired' });
      expect(unknown.status).toBe(404);
      expect(unknown.body).toEqual({
        _tag: 'DebtAmountNotFound',
        error: 'Debt amount not found',
      });
    }),
  );

  testEffect('answer the old not-found body for a missing payment', () =>
    Effect.gen(function* () {
      const { ana } = yield* threeUsers;
      const debt = yield* createDebt(ana.device);

      const response = yield* ana.device.delete(
        `/api/debts/${debt.id}/payments/ghost`,
      );

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        _tag: 'DebtPaymentNotFound',
        error: 'Payment not found',
      });
    }),
  );
});
