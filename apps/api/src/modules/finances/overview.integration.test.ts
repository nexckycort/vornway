import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { testEffect } from '../../../testkit/effect';
import { createAccount, twoUsers } from './testing';

describe('finance summary', () => {
  testEffect('creates the default account and categories on first use', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const summary = yield* ana.device.get('/api/finances/summary');

      expect(summary.status).toBe(200);
      expect(summary.body.currency).toBe('COP');
      expect(summary.body.month).toMatch(/^\d{4}-\d{2}$/);
      expect(summary.body.accounts).toEqual([
        expect.objectContaining({ name: 'Efectivo', accountType: 'CASH' }),
      ]);
      expect((summary.body.categories as unknown[]).length).toBe(9);
    }),
  );

  testEffect('adds the month of a user up without leaking other users', () =>
    Effect.gen(function* () {
      const { ana, bruno } = yield* twoUsers;
      const account = yield* createAccount(ana.device, {
        currency: 'COP',
        currentBalance: 1000,
      });
      const category = yield* ana.device.post('/api/finances/categories', {
        name: 'Fun',
        type: 'expense',
      });
      for (const body of [
        {
          type: 'income',
          amount: 500,
          description: 'Pay',
          occurredAt: '2026-04-10T12:00:00.000Z',
        },
        {
          type: 'expense',
          amount: 120,
          description: 'Cinema',
          categoryId: category.body.id,
          accountId: account.id,
          tags: ['night'],
          occurredAt: '2026-04-11T12:00:00.000Z',
        },
      ]) {
        yield* ana.device.post('/api/finances/transactions', body);
      }
      yield* bruno.device.post('/api/finances/transactions', {
        type: 'income',
        amount: 9999,
        description: 'Not yours',
        occurredAt: '2026-04-10T12:00:00.000Z',
      });

      const summary = yield* ana.device.get(
        '/api/finances/summary?month=2026-04&timeZone=America/Bogota',
      );

      expect(summary.body).toMatchObject({
        month: '2026-04',
        totals: {
          incomeByCurrency: { COP: 500 },
          personalExpenseByCurrency: { COP: 120 },
          totalExpenseByCurrency: { COP: 120 },
          balanceByCurrency: { COP: 380 },
          accountTotalByCurrency: { COP: 880 },
        },
        counts: { transactions: 2, groupExpenses: 0 },
        categoryExpenseTotals: [
          { categoryName: 'Fun', currency: 'COP', amount: 120 },
        ],
        tagExpenseTotals: [{ tagName: 'night', amount: 120 }],
      });
      expect(
        (summary.body.recentTransactions as { description: string }[]).map(
          (transaction) => transaction.description,
        ),
      ).toEqual(['Cinema', 'Pay']);
    }),
  );

  testEffect('fall back to UTC for an unknown time zone', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const summary = yield* ana.device.get(
        '/api/finances/summary?month=2026-04&timeZone=Not/AZone',
      );

      expect(summary.status).toBe(200);
      expect(summary.body.month).toBe('2026-04');
    }),
  );

  testEffect('rejects malformed queries', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      for (const query of ['month=2026-4', 'currency=US']) {
        const response = yield* ana.device.get(
          `/api/finances/summary?${query}`,
        );
        expect(response.status).toBe(400);
        expect(response.body._tag).toBe('InvalidRequest');
      }
    }),
  );
});

describe('finance movements', () => {
  testEffect('merge transactions and debts, newest first, page by page', () =>
    Effect.gen(function* () {
      const { ana, bruno } = yield* twoUsers;
      for (const day of [1, 2, 3]) {
        yield* ana.device.post('/api/finances/transactions', {
          type: 'income',
          amount: day,
          description: `Day ${day}`,
          occurredAt: `2026-05-0${day}T12:00:00.000Z`,
        });
      }
      yield* bruno.device.post('/api/finances/transactions', {
        type: 'income',
        amount: 1,
        description: 'Not yours',
        occurredAt: '2026-05-02T12:00:00.000Z',
      });
      yield* ana.device.post('/api/debts', {
        name: 'Loan',
        counterpartyName: 'Carlos',
        direction: 'lent',
        principalAmount: 50,
        currency: 'cop',
        amounts: [{ amount: 50, loanDate: '2026-05-02T18:00:00.000Z' }],
      });

      const first = yield* ana.device.get(
        '/api/finances/movements?month=2026-05&limit=3',
      );
      const pagination = first.body.pagination as {
        total: number;
        nextCursor: string;
      };
      const second = yield* ana.device.get(
        `/api/finances/movements?month=2026-05&limit=3&cursor=${encodeURIComponent(pagination.nextCursor)}`,
      );

      const descriptions = (body: Record<string, unknown>) =>
        (body.data as { description: string; source: string }[]).map(
          (movement) => `${movement.source}:${movement.description}`,
        );
      expect(descriptions(first.body)).toEqual([
        'transaction:Day 3',
        'debt-loan:Loan',
        'transaction:Day 2',
      ]);
      expect(pagination.total).toBe(4);
      expect(descriptions(second.body)).toEqual(['transaction:Day 1']);
      expect(second.body.pagination).toMatchObject({ nextCursor: null });
    }),
  );

  testEffect('reject a limit out of range', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      for (const limit of [0, 51]) {
        const response = yield* ana.device.get(
          `/api/finances/movements?limit=${limit}`,
        );
        expect(response.status).toBe(400);
      }
    }),
  );

  testEffect('ignore a malformed cursor', () =>
    Effect.gen(function* () {
      const { ana } = yield* twoUsers;

      const response = yield* ana.device.get(
        '/api/finances/movements?cursor=nonsense',
      );

      expect(response.status).toBe(200);
    }),
  );
});
