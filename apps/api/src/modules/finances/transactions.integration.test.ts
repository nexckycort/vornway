import { describe, expect } from 'bun:test';
import { DateTime, Effect } from 'effect';
import { testEffect } from '../../../testkit/effect';
import { asList, balanceOf, createAccount, twoUsers } from './testing';

const NOW = DateTime.formatIso(DateTime.nowUnsafe());

describe('finance transactions', () => {
  testEffect('move the balance of their account while they change', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;
      const account = yield* createAccount(ana.device, { currentBalance: 100 });

      const created = yield* ana.device.post('/api/finances/transactions', {
        type: 'expense',
        amount: 30,
        description: 'Lunch',
        accountId: account.id,
        tags: ['#Food Trip', 'food-trip', 'bad tag!'],
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        type: 'EXPENSE',
        amount: 30,
        currency: 'COP',
        tags: [{ tag: { name: 'food-trip' } }, { tag: { name: 'bad-tag' } }],
      });
      expect(yield* balanceOf(ana.device, account.id)).toMatchObject({
        current: 70,
        available: 70,
      });

      const id = created.body.id as string;
      const updated = yield* ana.device.patch(
        `/api/finances/transactions/${id}`,
        { amount: 50, description: ' Dinner ', tags: [] },
      );
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({
        amount: 50,
        description: 'Dinner',
        tags: [],
      });
      expect(yield* balanceOf(ana.device, account.id)).toMatchObject({
        current: 50,
      });

      const removed = yield* ana.device.delete(
        `/api/finances/transactions/${id}`,
      );
      expect(removed).toEqual({ status: 200, body: { ok: true } });
      expect(yield* balanceOf(ana.device, account.id)).toMatchObject({
        current: 100,
      });
    }),
  );

  testEffect('flatten their tags when they are read', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;
      const created = yield* ana.device.post('/api/finances/transactions', {
        type: 'income',
        amount: 5,
        description: 'Gift',
        occurredAt: NOW,
        tags: ['party'],
      });

      const read = yield* ana.device.get(
        `/api/finances/transactions/${created.body.id}`,
      );
      const recent = yield* ana.device.get(
        '/api/finances/transactions?limit=5',
      );

      expect(read.body).toMatchObject({
        description: 'Gift',
        tags: [{ name: 'party', ownerId: ana.id }],
        account: null,
        category: null,
      });
      expect(recent.status).toBe(200);
      expect(asList(recent.body)).toEqual([
        expect.objectContaining({ id: created.body.id }),
      ]);
    }),
  );

  testEffect('reject categories and accounts that cannot be used', () =>
    Effect.gen(function* () {
      const { ana, bruno } = yield* twoUsers;
      const own = yield* createAccount(ana.device);
      const closed = yield* createAccount(ana.device);
      yield* ana.device.post(`/api/finances/accounts/${closed.id}/close`);
      const foreign = yield* createAccount(bruno.device);
      const category = yield* ana.device.post('/api/finances/categories', {
        name: 'Salary',
        type: 'income',
      });
      const base = {
        type: 'expense',
        amount: 10,
        description: 'Thing',
      };

      const wrongType = yield* ana.device.post('/api/finances/transactions', {
        ...base,
        categoryId: category.body.id,
      });
      const closedAccount = yield* ana.device.post(
        '/api/finances/transactions',
        { ...base, accountId: closed.id },
      );
      const foreignAccount = yield* ana.device.post(
        '/api/finances/transactions',
        { ...base, accountId: foreign.id },
      );
      const ok = yield* ana.device.post('/api/finances/transactions', {
        ...base,
        accountId: own.id,
      });

      expect(wrongType.status).toBe(400);
      expect(wrongType.body).toEqual({
        _tag: 'InvalidFinanceCategory',
        code: 'INVALID_FINANCE_CATEGORY',
        message: 'Invalid finance category',
      });
      expect(closedAccount.status).toBe(400);
      expect(foreignAccount.body).toMatchObject({
        _tag: 'InvalidFinanceAccount',
        code: 'INVALID_FINANCE_ACCOUNT',
      });
      expect(ok.status).toBe(201);
    }),
  );

  testEffect('are private to their owner', () =>
    Effect.gen(function* () {
      const { ana, bruno } = yield* twoUsers;
      const account = yield* createAccount(ana.device);
      const created = yield* ana.device.post('/api/finances/transactions', {
        type: 'expense',
        amount: 20,
        description: 'Mine',
        accountId: account.id,
      });
      const path = `/api/finances/transactions/${created.body.id}`;

      const read = yield* bruno.device.get(path);
      const update = yield* bruno.device.patch(path, { amount: 1 });
      const remove = yield* bruno.device.delete(path);
      const recent = yield* bruno.device.get('/api/finances/transactions');

      for (const response of [read, update, remove]) {
        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          _tag: 'FinanceTransactionNotFound',
          error: 'Finance transaction not found',
        });
      }
      expect(asList(recent.body)).toEqual([]);
      expect((yield* ana.device.get(path)).body).toMatchObject({ amount: 20 });
      expect(yield* balanceOf(ana.device, account.id)).toMatchObject({
        current: 80,
      });
    }),
  );
});

describe('finance categories', () => {
  testEffect('are created once per name and updated', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const created = yield* ana.device.post('/api/finances/categories', {
        name: ' Pets ',
        type: 'expense',
      });
      const sameName = yield* ana.device.post('/api/finances/categories', {
        name: 'pets',
        type: 'income',
      });
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        name: 'Pets',
        transactionType: 'EXPENSE',
        icon: 'tag',
        color: '#334155',
        isDefault: false,
      });
      expect(sameName.status).toBe(201);
      expect(sameName.body).toMatchObject({
        id: created.body.id,
        transactionType: 'BOTH',
      });

      const renamed = yield* ana.device.patch(
        `/api/finances/categories/${created.body.id}`,
        { name: 'Cats', icon: 'cat' },
      );
      expect(renamed.status).toBe(200);
      expect(renamed.body).toMatchObject({ name: 'Cats', icon: 'cat' });

      const clash = yield* ana.device.patch(
        `/api/finances/categories/${created.body.id}`,
        { name: 'comida' },
      );
      expect(clash.status).toBe(409);
      expect(clash.body).toMatchObject({
        _tag: 'FinanceCategoryNameTaken',
        code: 'FINANCE_CATEGORY_NAME_TAKEN',
      });

      const removed = yield* ana.device.delete(
        `/api/finances/categories/${created.body.id}`,
      );
      expect(removed).toEqual({ status: 200, body: { ok: true } });
      expect(
        (yield* ana.device.delete(
          `/api/finances/categories/${created.body.id}`,
        )).body,
      ).toEqual({
        _tag: 'FinanceCategoryNotFound',
        error: 'Finance category not found',
      });
    }),
  );

  testEffect('are private to their owner', () =>
    Effect.gen(function* () {
      const { ana, bruno } = yield* twoUsers;
      const created = yield* ana.device.post('/api/finances/categories', {
        name: 'Secret',
        type: 'both',
      });
      const path = `/api/finances/categories/${created.body.id}`;

      const update = yield* bruno.device.patch(path, { name: 'Hijacked' });
      const remove = yield* bruno.device.delete(path);
      const budget = yield* bruno.device.post('/api/finances/budgets', {
        categoryId: created.body.id,
        month: '2026-02',
        amount: 10,
      });

      expect(update.status).toBe(404);
      expect(remove.status).toBe(404);
      expect(budget.status).toBe(400);
      expect((yield* ana.device.patch(path, { icon: 'lock' })).status).toBe(
        200,
      );
    }),
  );
});

describe('finance budgets', () => {
  testEffect('are upserted per category, month and currency', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;
      const category = yield* ana.device.post('/api/finances/categories', {
        name: 'Fun',
        type: 'expense',
      });
      const payload = {
        categoryId: category.body.id,
        month: '2026-03',
        amount: 100.456,
      };

      const first = yield* ana.device.post('/api/finances/budgets', payload);
      const second = yield* ana.device.post('/api/finances/budgets', {
        ...payload,
        amount: 200,
      });
      const incomeCategory = yield* ana.device.post(
        '/api/finances/categories',
        {
          name: 'Prize',
          type: 'income',
        },
      );
      const invalid = yield* ana.device.post('/api/finances/budgets', {
        ...payload,
        categoryId: incomeCategory.body.id,
      });

      expect(first.status).toBe(201);
      expect(first.body).toMatchObject({
        amount: 100.46,
        currency: 'COP',
        month: '2026-03-01T00:00:00.000Z',
        category: { name: 'Fun' },
      });
      expect(second.status).toBe(201);
      expect(second.body).toMatchObject({ id: first.body.id, amount: 200 });
      expect(invalid.status).toBe(400);
      expect(invalid.body._tag).toBe('InvalidFinanceCategory');
    }),
  );

  testEffect('reject a malformed month', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const response = yield* ana.device.post('/api/finances/budgets', {
        categoryId: 'x',
        month: '2026-3',
        amount: 1,
      });

      expect(response.status).toBe(400);
      expect(response.body._tag).toBe('InvalidRequest');
    }),
  );
});
