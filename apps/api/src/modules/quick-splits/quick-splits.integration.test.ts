import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import {
  addExpense,
  createSplit,
  setup,
  withExpense,
} from './quick-splits.testing';

describe('quick splits', () => {
  testEffect('require a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const requests: [string, string][] = [
        ['GET', '/api/quick-splits/expenses'],
        ['POST', '/api/quick-splits'],
        ['POST', '/api/quick-splits/q/expenses'],
        ['POST', '/api/quick-splits/q/expenses/e/settlements'],
        ['PUT', '/api/quick-splits/q/expenses/e'],
        ['GET', '/api/quick-splits/q/expenses/e'],
        ['DELETE', '/api/quick-splits/q/expenses/e'],
      ];

      const statuses = yield* Effect.all(
        requests.map(([method, path]) =>
          Effect.map(
            app.fetch(path, {
              method,
              headers: { 'content-type': 'application/json' },
              ...(method === 'GET' || method === 'DELETE'
                ? {}
                : { body: '{}' }),
            }),
            (response) => response.status,
          ),
        ),
      );

      expect(statuses).toEqual(requests.map(() => 401));
    }),
  );

  describe('create', () => {
    testEffect('adds the owner, registered users and named guests', () =>
      Effect.gen(function* () {
        const { app, ana, bruno } = yield* setup;

        const response = yield* ana.device.post('/api/quick-splits', {
          name: '  Beach  ',
          description: ' sunny ',
          participants: [
            { userId: bruno.id, name: 'Bruno', clientId: 'c-bruno' },
            { name: 'Guest', clientId: 'c-guest' },
          ],
        });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          id: expect.any(String),
          name: 'Beach',
          description: 'sunny',
          participants: [
            {
              id: expect.any(String),
              userId: ana.id,
              name: expect.any(String),
              role: 'owner',
            },
            {
              id: expect.any(String),
              clientId: 'c-bruno',
              userId: bruno.id,
              name: 'Bruno',
              role: 'participant',
            },
            {
              id: expect.any(String),
              clientId: 'c-guest',
              userId: null,
              name: 'Guest',
              role: 'participant',
            },
          ],
          createdAt: expect.any(String),
        });
        expect(
          yield* app.db.query('select "ownerId" from quick_split'),
        ).toEqual([{ ownerId: ana.id }]);
      }),
    );

    testEffect('accepts a client generated id', () =>
      Effect.gen(function* () {
        const { ana } = yield* setup;
        const id = crypto.randomUUID();

        const split = yield* createSplit(ana.device, [{ name: 'Guest' }], {
          id,
        });

        expect(split.id).toBe(id);
      }),
    );

    testEffect('requires someone besides the owner', () =>
      Effect.gen(function* () {
        const { ana } = yield* setup;

        const response = yield* ana.device.post('/api/quick-splits', {
          name: 'Alone',
          participants: [{ userId: ana.id, name: 'Me' }],
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          _tag: 'QuickSplitParticipantsRequired',
          code: 'QUICK_SPLIT_PARTICIPANTS_REQUIRED',
          message: 'Debes incluir al menos un participante registrado',
        });
      }),
    );

    testEffect('rejects users that do not exist', () =>
      Effect.gen(function* () {
        const { ana } = yield* setup;

        const response = yield* ana.device.post('/api/quick-splits', {
          name: 'Ghosts',
          participants: [{ userId: 'nobody', name: 'Nobody' }],
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          _tag: 'QuickSplitParticipantsNotFound',
          code: 'QUICK_SPLIT_PARTICIPANTS_NOT_FOUND',
          message: 'Uno o más participantes no existen',
        });
      }),
    );

    testEffect('rejects invalid payloads', () =>
      Effect.gen(function* () {
        const { ana, bruno } = yield* setup;
        const invalid = [
          { name: ' ', participants: [{ name: 'A' }] },
          { name: 'Trip', participants: [] },
          { name: 'Trip', id: 'not-a-uuid', participants: [{ name: 'A' }] },
          { name: 'Trip', participants: [{ name: 'A' }, { name: 'a' }] },
          {
            name: 'Trip',
            participants: [
              { userId: bruno.id, name: 'B' },
              { userId: bruno.id, name: 'C' },
            ],
          },
        ];

        const responses = yield* Effect.all(
          invalid.map((payload) =>
            ana.device.post('/api/quick-splits', payload),
          ),
        );

        expect(responses.map((response) => response.status)).toEqual(
          invalid.map(() => 400),
        );
        expect(responses.map((response) => response.body._tag)).toEqual(
          invalid.map(() => 'InvalidRequest'),
        );
      }),
    );
  });

  describe('createExpense', () => {
    testEffect('splits equally by default, paid by the caller', () =>
      Effect.gen(function* () {
        const { app, ana, bruno } = yield* setup;
        const split = yield* createSplit(ana.device, [
          { userId: bruno.id, name: 'Bruno' },
          { name: 'Guest' },
        ]);

        const response = yield* addExpense(ana.device, split.id, {
          amount: 100,
        });

        const [owner = '', ...others] = split.participants.map(
          (participant) => participant.id,
        );
        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          id: expect.any(String),
          quickSplitId: split.id,
          description: 'Dinner',
          amount: 100,
          currency: 'COP',
          paidByParticipantId: owner,
          splitMethod: 'equal',
          participants: expect.arrayContaining([
            { participantId: owner, share: 33.33 },
            ...others.map((participantId) => ({
              participantId,
              share: expect.any(Number),
            })),
          ]),
          createdAt: expect.any(String),
        });
        const shares = (response.body.participants as { share: number }[]).map(
          (participant) => participant.share,
        );
        expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(
          100,
          2,
        );
        expect(
          yield* app.db.query(
            'select count(*)::int as count from quick_split_expense',
          ),
        ).toEqual([{ count: 1 }]);
      }),
    );

    testEffect('is idempotent for a client generated expense id', () =>
      Effect.gen(function* () {
        const { app, ana, bruno } = yield* setup;
        const split = yield* createSplit(ana.device, [
          { userId: bruno.id, name: 'Bruno' },
        ]);

        const first = yield* addExpense(ana.device, split.id, {
          id: 'expense-1',
        });
        const second = yield* addExpense(ana.device, split.id, {
          id: 'expense-1',
          amount: 10,
        });

        expect(first.status).toBe(201);
        expect(second.status).toBe(201);
        expect(second.body).toEqual(first.body);
        expect(
          yield* app.db.query(
            'select count(*)::int as count from quick_split_expense',
          ),
        ).toEqual([{ count: 1 }]);
      }),
    );

    testEffect(
      'refuses an expense id that belongs to another quick split',
      () =>
        Effect.gen(function* () {
          const { ana, bruno } = yield* setup;
          const first = yield* createSplit(ana.device, [
            { userId: bruno.id, name: 'Bruno' },
          ]);
          const second = yield* createSplit(ana.device, [{ name: 'Guest' }]);
          yield* addExpense(ana.device, first.id, { id: 'shared-id' });

          const response = yield* addExpense(ana.device, second.id, {
            id: 'shared-id',
          });

          expect(response.status).toBe(400);
          expect(response.body._tag).toBe('QuickSplitExpenseSharesInvalid');
        }),
    );

    testEffect('splits by percentage, accepting user ids as keys', () =>
      Effect.gen(function* () {
        const { ana, bruno } = yield* setup;
        const split = yield* createSplit(ana.device, [
          { userId: bruno.id, name: 'Bruno' },
        ]);
        const brunoParticipant = split.participants.find(
          (participant) => participant.userId === bruno.id,
        );

        const response = yield* addExpense(ana.device, split.id, {
          splitMethod: 'percentage',
          percentageShares: { [ana.id]: 25, [brunoParticipant?.id ?? '']: 75 },
        });

        expect(response.status).toBe(201);
        expect(response.body.splitMethod).toBe('percentage');
        expect(response.body.participants).toEqual(
          expect.arrayContaining([
            { participantId: brunoParticipant?.id, share: 67.5 },
          ]),
        );
      }),
    );

    testEffect('splits exact amounts and defaults omitted ones to zero', () =>
      Effect.gen(function* () {
        const { ana, bruno } = yield* setup;
        const split = yield* createSplit(ana.device, [
          { userId: bruno.id, name: 'Bruno' },
        ]);
        const brunoParticipant = split.participants.find(
          (participant) => participant.userId === bruno.id,
        );

        const response = yield* addExpense(ana.device, split.id, {
          splitMethod: 'exact',
          exactShares: { [brunoParticipant?.id ?? '']: 90 },
        });

        expect(response.status).toBe(201);
        expect(response.body.participants).toEqual(
          expect.arrayContaining([
            { participantId: brunoParticipant?.id, share: 90 },
          ]),
        );
      }),
    );

    testEffect('rejects shares that do not add up', () =>
      Effect.gen(function* () {
        const { ana, bruno } = yield* setup;
        const split = yield* createSplit(ana.device, [
          { userId: bruno.id, name: 'Bruno' },
        ]);
        const [owner, other] = split.participants;

        const exact = yield* addExpense(ana.device, split.id, {
          splitMethod: 'exact',
          exactShares: { [owner?.id ?? '']: 10, [other?.id ?? '']: 10 },
        });
        const percentage = yield* addExpense(ana.device, split.id, {
          splitMethod: 'percentage',
          percentageShares: { [owner?.id ?? '']: 50, [other?.id ?? '']: 40 },
        });
        const unknown = yield* addExpense(ana.device, split.id, {
          splitMethod: 'exact',
          exactShares: { stranger: 90 },
        });

        for (const response of [exact, percentage, unknown]) {
          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            _tag: 'QuickSplitExpenseSharesInvalid',
            code: 'QUICK_SPLIT_EXPENSE_SHARES_INVALID',
            message: 'La división del gasto no es válida',
          });
        }
      }),
    );

    testEffect('rejects a payer outside the quick split', () =>
      Effect.gen(function* () {
        const { ana, bruno } = yield* setup;
        const split = yield* createSplit(ana.device, [
          { userId: bruno.id, name: 'Bruno' },
        ]);

        const response = yield* addExpense(ana.device, split.id, {
          paidByParticipantId: 'stranger',
        });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          _tag: 'QuickSplitExpensePayerInvalid',
          code: 'QUICK_SPLIT_EXPENSE_PAYER_INVALID',
          message: 'El pagador no pertenece al gasto rápido',
        });
      }),
    );

    testEffect('rejects invalid payloads', () =>
      Effect.gen(function* () {
        const { ana } = yield* setup;
        const split = yield* createSplit(ana.device, [{ name: 'Guest' }]);
        const invalid = [
          { amount: 0 },
          { amount: -5 },
          { description: ' ' },
          { currency: 'COPS' },
          { splitMethod: 'weird' },
          { splitMethod: 'exact' },
          { splitMethod: 'percentage' },
          { metadata: { items: [{ name: 'x', amount: 0 }] } },
        ];

        const responses = yield* Effect.all(
          invalid.map((expense) => addExpense(ana.device, split.id, expense)),
        );

        expect(responses.map((response) => response.status)).toEqual(
          invalid.map(() => 400),
        );
        expect(responses.map((response) => response.body._tag)).toEqual(
          invalid.map(() => 'InvalidRequest'),
        );
      }),
    );

    testEffect('is not available to users outside the quick split', () =>
      Effect.gen(function* () {
        const { app, ana, bruno, carla } = yield* setup;
        const split = yield* createSplit(ana.device, [
          { userId: bruno.id, name: 'Bruno' },
        ]);

        const response = yield* addExpense(carla.device, split.id);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          _tag: 'QuickSplitNotFound',
          code: 'QUICK_SPLIT_NOT_FOUND',
          message: 'Gasto rápido no encontrado',
        });
        expect(
          yield* app.db.query(
            'select count(*)::int as count from quick_split_expense',
          ),
        ).toEqual([{ count: 0 }]);
      }),
    );
  });

  describe('listExpenses', () => {
    testEffect('walks the feed with limit, nextCursor and total', () =>
      Effect.gen(function* () {
        const { ana, bruno } = yield* setup;
        const ids = yield* Effect.all(
          [1, 2, 3, 4, 5].map((index) =>
            Effect.gen(function* () {
              const split = yield* createSplit(ana.device, [
                { userId: bruno.id, name: 'Bruno' },
              ]);
              const expense = yield* addExpense(ana.device, split.id, {
                description: `Expense ${index}`,
              });
              return expense.body.id as string;
            }),
          ),
          { concurrency: 1 },
        );

        const seen: string[] = [];
        const pages: {
          limit: number;
          total: number;
          nextCursor: string | null;
        }[] = [];
        let cursor: string | null = null;
        do {
          const response = yield* bruno.device.get(
            `/api/quick-splits/expenses?limit=2${cursor ? `&cursor=${cursor}` : ''}`,
          );
          expect(response.status).toBe(200);
          const page = response.body.pagination as (typeof pages)[number];
          pages.push(page);
          seen.push(
            ...(response.body.data as { id: string }[]).map((item) => item.id),
          );
          cursor = page.nextCursor;
        } while (cursor);

        expect(pages.map((page) => page.limit)).toEqual([2, 2, 2]);
        expect(pages.map((page) => page.total)).toEqual([5, 5, 5]);
        expect(pages.map((page) => page.nextCursor === null)).toEqual([
          false,
          false,
          true,
        ]);
        expect(seen).toHaveLength(5);
        expect(new Set(seen)).toEqual(new Set(ids));
      }),
    );

    testEffect('defaults to twelve items and rejects out of range limits', () =>
      Effect.gen(function* () {
        const { ana } = yield* setup;

        const defaults = yield* ana.device.get('/api/quick-splits/expenses');
        const tooBig = yield* ana.device.get(
          '/api/quick-splits/expenses?limit=51',
        );
        const zero = yield* ana.device.get(
          '/api/quick-splits/expenses?limit=0',
        );

        expect(defaults.body).toEqual({
          data: [],
          pagination: { limit: 12, total: 0, nextCursor: null },
        });
        expect(tooBig.status).toBe(400);
        expect(zero.status).toBe(400);
        expect(tooBig.body._tag).toBe('InvalidRequest');
      }),
    );

    testEffect(
      'only lists expenses of quick splits the user takes part in',
      () =>
        Effect.gen(function* () {
          const { ana, carla, split, expenseId } = yield* withExpense();

          const anaFeed = yield* ana.device.get('/api/quick-splits/expenses');
          const carlaFeed = yield* carla.device.get(
            '/api/quick-splits/expenses',
          );

          expect(anaFeed.body).toEqual({
            data: [
              {
                id: expenseId,
                quickSplitId: split.id,
                quickSplitName: 'Trip',
                description: 'Dinner',
                amount: 90,
                currency: 'COP',
                participantCount: 2,
                paidBy: {
                  id: split.participants[0]?.id,
                  userId: ana.id,
                  name: expect.any(String),
                },
                participants: [
                  {
                    id: split.participants[0]?.id,
                    userId: ana.id,
                    name: expect.any(String),
                    image: null,
                  },
                  {
                    id: split.participants[1]?.id,
                    userId: expect.any(String),
                    name: 'Bruno',
                    image: null,
                  },
                ],
                currentUserBalance: 45,
                createdAt: expect.any(String),
              },
            ],
            pagination: { limit: 12, total: 1, nextCursor: null },
          });
          expect(carlaFeed.body).toEqual({
            data: [],
            pagination: { limit: 12, total: 0, nextCursor: null },
          });
        }),
    );
  });
});
