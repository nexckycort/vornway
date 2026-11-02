import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { balanceOf, createAccount, twoUsers } from './testing';

describe('finance accounts', () => {
  testEffect('require a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      for (const path of [
        '/api/finances/summary',
        '/api/finances/accounts',
        '/api/finances/accounts/x',
        '/api/finances/movements',
        '/api/finances/transactions',
      ]) {
        expect((yield* app.fetch(path)).status).toBe(401);
      }
      expect(
        (yield* app.fetch('/api/finances/accounts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })).status,
      ).toBe(401);
    }),
  );

  testEffect('are created, read, updated, closed and archived', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const created = yield* createAccount(ana.device, {
        name: ' Main ',
        institution: 'Bank',
        currency: 'usd',
        currentBalance: 250.456,
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        ownerId: ana.id,
        name: 'Main',
        accountType: 'CASH',
        institution: 'Bank',
        currency: 'USD',
        currentBalance: 250.46,
        availableBalance: 250.46,
        status: 'ACTIVE',
        creditLimit: null,
        archivedAt: null,
      });

      const read = yield* ana.device.get(
        `/api/finances/accounts/${created.id}`,
      );
      expect(read.status).toBe(200);
      expect(read.body.id).toBe(created.id);

      const updated = yield* ana.device.patch(
        `/api/finances/accounts/${created.id}`,
        { name: 'Renamed', notes: '  hi ', lockedBalance: 5 },
      );
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({
        name: 'Renamed',
        notes: 'hi',
        lockedBalance: 5,
        currency: 'USD',
      });

      const closed = yield* ana.device.post(
        `/api/finances/accounts/${created.id}/close`,
      );
      expect(closed.status).toBe(200);
      expect(closed.body).toMatchObject({ status: 'CLOSED' });
      expect(closed.body.closedAt).toEqual(expect.any(String));

      const archived = yield* ana.device.delete(
        `/api/finances/accounts/${created.id}`,
      );
      expect(archived).toEqual({ status: 200, body: { ok: true } });
      expect(
        (yield* ana.device.get(`/api/finances/accounts/${created.id}`)).status,
      ).toBe(404);
    }),
  );

  testEffect('answer the old not-found body', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const response = yield* ana.device.get('/api/finances/accounts/missing');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        _tag: 'FinanceAccountNotFound',
        error: 'Finance account not found',
      });
    }),
  );

  testEffect('need a limit when they are credit cards', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const rejected = yield* createAccount(ana.device, {
        type: 'credit_card',
        currentBalance: 30,
      });
      const accepted = yield* createAccount(ana.device, {
        type: 'credit_card',
        currentBalance: 30,
        creditLimit: 100,
      });

      expect(rejected.status).toBe(400);
      expect(rejected.body).toMatchObject({
        _tag: 'CreditCardLimitRequired',
        code: 'CREDIT_CARD_LIMIT_REQUIRED',
      });
      expect(accepted.body).toMatchObject({
        usedCredit: 30,
        creditLimit: 100,
        availableBalance: 70,
      });
    }),
  );

  testEffect('keep the currency when an update does not send one', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;
      const account = yield* createAccount(ana.device, { currency: 'USD' });

      const updated = yield* ana.device.patch(
        `/api/finances/accounts/${account.id}`,
        { name: 'Same currency' },
      );

      expect(updated.body.currency).toBe('USD');
    }),
  );

  testEffect('are paginated with a cursor', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;
      const ids = new Set<string>();
      for (const index of [1, 2, 3, 4, 5]) {
        ids.add((yield* createAccount(ana.device, { name: `A${index}` })).id);
      }

      const seen: string[] = [];
      let cursor = '';
      let pages = 0;
      let total = 0;
      do {
        const page = yield* ana.device.get(
          `/api/finances/accounts?limit=2${cursor && `&cursor=${cursor}`}`,
        );
        const data = page.body.data as { id: string }[];
        const pagination = page.body.pagination as {
          limit: number;
          total: number;
          nextCursor: string | null;
        };
        expect(page.status).toBe(200);
        expect(pagination.limit).toBe(2);
        total = pagination.total;
        seen.push(...data.map((account) => account.id));
        cursor = pagination.nextCursor ?? '';
        pages += 1;
      } while (cursor);

      expect(total).toBe(5);
      expect(pages).toBe(3);
      expect(new Set(seen)).toEqual(ids);
      expect(seen).toHaveLength(5);
    }),
  );

  testEffect('are private to their owner', () =>
    Effect.gen(function* () {
      const { ana, bruno } = yield* twoUsers;
      const account = yield* createAccount(ana.device);

      const read = yield* bruno.device.get(
        `/api/finances/accounts/${account.id}`,
      );
      const movements = yield* bruno.device.get(
        `/api/finances/accounts/${account.id}/movements`,
      );
      const update = yield* bruno.device.patch(
        `/api/finances/accounts/${account.id}`,
        { name: 'Hijacked' },
      );
      const close = yield* bruno.device.post(
        `/api/finances/accounts/${account.id}/close`,
      );
      const remove = yield* bruno.device.delete(
        `/api/finances/accounts/${account.id}`,
      );
      const list = yield* bruno.device.get('/api/finances/accounts');

      for (const response of [read, movements, update, close, remove]) {
        expect(response.status).toBe(404);
      }
      expect(list.body.data).toEqual([]);
      expect(
        (yield* ana.device.get(`/api/finances/accounts/${account.id}`)).body,
      ).toMatchObject({ name: 'Wallet', status: 'ACTIVE' });
    }),
  );

  testEffect('list their movements page by page', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;
      const account = yield* createAccount(ana.device, { currentBalance: 0 });
      for (const day of [1, 2, 3]) {
        yield* ana.device.post('/api/finances/transactions', {
          type: 'income',
          amount: 10 * day,
          description: `Day ${day}`,
          accountId: account.id,
          occurredAt: `2026-01-0${day}T12:00:00.000Z`,
        });
      }
      expect(yield* balanceOf(ana.device, account.id)).toMatchObject({
        current: 60,
      });

      const first = yield* ana.device.get(
        `/api/finances/accounts/${account.id}/movements?limit=2`,
      );
      const pagination = first.body.pagination as {
        total: number;
        nextCursor: string;
      };
      const second = yield* ana.device.get(
        `/api/finances/accounts/${account.id}/movements?limit=2&cursor=${pagination.nextCursor}`,
      );

      expect(
        (first.body.data as { description: string }[]).map(
          (movement) => movement.description,
        ),
      ).toEqual(['Day 3', 'Day 2']);
      expect(pagination.total).toBe(3);
      expect(second.body.data).toEqual([
        expect.objectContaining({
          description: 'Day 1',
          source: 'transaction',
        }),
      ]);
      expect(second.body.pagination).toMatchObject({ nextCursor: null });
    }),
  );

  testEffect('reject invalid input with the validation body', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const badLimit = yield* ana.device.get('/api/finances/accounts?limit=0');
      const badCurrency = yield* ana.device.post('/api/finances/accounts', {
        name: 'X',
        type: 'cash',
        currentBalance: 1,
        currency: 'COPP',
      });
      const badType = yield* ana.device.post('/api/finances/accounts', {
        name: 'X',
        type: 'piggy',
        currentBalance: 1,
      });

      for (const response of [badLimit, badCurrency, badType]) {
        expect(response.status).toBe(400);
        expect(response.body._tag).toBe('InvalidRequest');
      }
    }),
  );
});
