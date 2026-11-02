import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import type { Device } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { createSplit, withExpense } from './quick-splits.testing';

describe('quick split expenses', () => {
  describe('expenseDetail', () => {
    testEffect(
      'answers the expense with participants, shares and settlements',
      () =>
        Effect.gen(function* () {
          const { bruno, split, expenseId } = yield* withExpense({
            metadata: {
              category: 'food',
              items: [{ name: 'Pizza', amount: 90 }],
            },
          });

          const response = yield* bruno.device.get(
            `/api/quick-splits/${split.id}/expenses/${expenseId}`,
          );

          expect(response.status).toBe(200);
          expect(response.body).toEqual({
            id: expenseId,
            quickSplitId: split.id,
            quickSplitName: 'Trip',
            description: 'Dinner',
            amount: 90,
            currency: 'COP',
            splitMethod: 'equal',
            createdAt: expect.any(String),
            metadata: {
              category: 'food',
              items: [{ name: 'Pizza', amount: 90 }],
            },
            paidBy: {
              id: split.participants[0]?.id,
              userId: expect.any(String),
              name: expect.any(String),
              image: null,
            },
            participants: [
              {
                id: split.participants[0]?.id,
                userId: expect.any(String),
                name: expect.any(String),
                image: null,
                share: 45,
                role: 'owner',
              },
              {
                id: split.participants[1]?.id,
                userId: expect.any(String),
                name: 'Bruno',
                image: null,
                share: 45,
                role: 'participant',
              },
            ],
            settlements: [],
          });
        }),
    );

    testEffect('is not readable by users outside the quick split', () =>
      Effect.gen(function* () {
        const { carla, split, expenseId } = yield* withExpense();

        const response = yield* carla.device.get(
          `/api/quick-splits/${split.id}/expenses/${expenseId}`,
        );

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
          _tag: 'QuickSplitExpenseNotFound',
          code: 'QUICK_SPLIT_EXPENSE_NOT_FOUND',
          message: 'Gasto con amigos no encontrado',
        });
      }),
    );

    testEffect('does not find an expense under another quick split', () =>
      Effect.gen(function* () {
        const { ana, expenseId } = yield* withExpense();
        const other = yield* createSplit(ana.device, [{ name: 'Guest' }]);

        const response = yield* ana.device.get(
          `/api/quick-splits/${other.id}/expenses/${expenseId}`,
        );

        expect(response.status).toBe(404);
      }),
    );
  });

  describe('updateExpense', () => {
    testEffect('changes the expense and recomputes the shares', () =>
      Effect.gen(function* () {
        const { app, bruno, split, expenseId } = yield* withExpense();
        const brunoParticipant = split.participants[1];

        const response = yield* bruno.device.put(
          `/api/quick-splits/${split.id}/expenses/${expenseId}`,
          {
            description: 'Lunch',
            amount: 60,
            currency: 'usd',
            paidByParticipantId: brunoParticipant?.id,
          },
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          id: expenseId,
          quickSplitId: split.id,
          description: 'Lunch',
          amount: 60,
          currency: 'USD',
          paidByParticipantId: brunoParticipant?.id,
          splitMethod: 'equal',
          participants: [
            { participantId: expect.any(String), share: 30 },
            { participantId: expect.any(String), share: 30 },
          ],
          createdAt: expect.any(String),
        });
        expect(
          yield* app.db.query(
            'select description, currency from quick_split_expense',
          ),
        ).toEqual([{ description: 'Lunch', currency: 'USD' }]);
      }),
    );

    testEffect('is not allowed for users outside the quick split', () =>
      Effect.gen(function* () {
        const { app, carla, split, expenseId } = yield* withExpense();

        const response = yield* carla.device.put(
          `/api/quick-splits/${split.id}/expenses/${expenseId}`,
          {
            description: 'Hacked',
            amount: 1,
            currency: 'COP',
          },
        );

        expect(response.status).toBe(404);
        expect(response.body._tag).toBe('QuickSplitExpenseNotFound');
        expect(
          yield* app.db.query('select description from quick_split_expense'),
        ).toEqual([{ description: 'Dinner' }]);
      }),
    );

    testEffect('answers 404 for an unknown expense', () =>
      Effect.gen(function* () {
        const { ana, split } = yield* withExpense();

        const response = yield* ana.device.put(
          `/api/quick-splits/${split.id}/expenses/missing`,
          {
            description: 'x',
            amount: 1,
            currency: 'COP',
          },
        );

        expect(response.status).toBe(404);
        expect(response.body._tag).toBe('QuickSplitExpenseNotFound');
      }),
    );
  });

  describe('settleDebt', () => {
    const settle = (
      device: Device,
      quickSplitId: string,
      expenseId: string,
      body: object,
    ) =>
      device.post(
        `/api/quick-splits/${quickSplitId}/expenses/${expenseId}/settlements`,
        body,
      );

    testEffect('records a payment and lowers the balance', () =>
      Effect.gen(function* () {
        const { app, ana, bruno, split, expenseId } = yield* withExpense();
        const [owner, other] = split.participants;

        const response = yield* settle(bruno.device, split.id, expenseId, {
          fromParticipantId: other?.id,
          toParticipantId: owner?.id,
          amount: 20,
          currency: 'cop',
        });
        const feed = yield* bruno.device.get('/api/quick-splits/expenses');

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          id: expect.any(String),
          expenseId,
          amount: 20,
          currency: 'COP',
        });
        expect(
          (feed.body.data as { currentUserBalance: number }[])[0]
            ?.currentUserBalance,
        ).toBe(-25);
        const detail = yield* ana.device.get(
          `/api/quick-splits/${split.id}/expenses/${expenseId}`,
        );
        expect(detail.body.settlements).toEqual([
          {
            id: expect.any(String),
            from: { id: other?.id, userId: bruno.id, name: 'Bruno' },
            to: { id: owner?.id, userId: ana.id, name: expect.any(String) },
            amount: 20,
            currency: 'COP',
            createdAt: expect.any(String),
          },
        ]);
        expect(
          yield* app.db.query(
            'select count(*)::int as count from quick_split_expense_settlement',
          ),
        ).toEqual([{ count: 1 }]);
      }),
    );

    testEffect('refuses more than the outstanding amount', () =>
      Effect.gen(function* () {
        const { bruno, split, expenseId } = yield* withExpense();
        const [owner, other] = split.participants;
        const payment = (amount: number, currency = 'COP') => ({
          fromParticipantId: other?.id,
          toParticipantId: owner?.id,
          amount,
          currency,
        });

        yield* settle(bruno.device, split.id, expenseId, payment(40));
        const tooMuch = yield* settle(
          bruno.device,
          split.id,
          expenseId,
          payment(6),
        );
        const wrongCurrency = yield* settle(
          bruno.device,
          split.id,
          expenseId,
          payment(1, 'USD'),
        );

        for (const response of [tooMuch, wrongCurrency]) {
          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            _tag: 'QuickSplitSettlementAmountInvalid',
            code: 'QUICK_SPLIT_SETTLEMENT_AMOUNT_INVALID',
            message:
              'El monto supera el saldo pendiente de la persona seleccionada',
          });
        }
      }),
    );

    testEffect('refuses unknown or identical participants', () =>
      Effect.gen(function* () {
        const { ana, split, expenseId } = yield* withExpense();
        const owner = split.participants[0]?.id;

        const unknown = yield* settle(ana.device, split.id, expenseId, {
          fromParticipantId: 'stranger',
          toParticipantId: owner,
          amount: 1,
          currency: 'COP',
        });
        const same = yield* settle(ana.device, split.id, expenseId, {
          fromParticipantId: owner,
          toParticipantId: owner,
          amount: 1,
          currency: 'COP',
        });

        for (const response of [unknown, same]) {
          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            _tag: 'QuickSplitSettlementParticipantsInvalid',
            code: 'QUICK_SPLIT_SETTLEMENT_PARTICIPANTS_INVALID',
            message: 'Los participantes de la liquidación no son válidos',
          });
        }
      }),
    );

    testEffect('is not allowed for users outside the quick split', () =>
      Effect.gen(function* () {
        const { app, carla, split, expenseId } = yield* withExpense();
        const [owner, other] = split.participants;

        const response = yield* settle(carla.device, split.id, expenseId, {
          fromParticipantId: other?.id,
          toParticipantId: owner?.id,
          amount: 5,
          currency: 'COP',
        });

        expect(response.status).toBe(404);
        expect(response.body._tag).toBe('QuickSplitExpenseNotFound');
        expect(
          yield* app.db.query(
            'select count(*)::int as count from quick_split_expense_settlement',
          ),
        ).toEqual([{ count: 0 }]);
      }),
    );
  });

  describe('deleteExpense', () => {
    testEffect('removes the expense for any participant', () =>
      Effect.gen(function* () {
        const { app, bruno, split, expenseId } = yield* withExpense();

        const response = yield* bruno.device.delete(
          `/api/quick-splits/${split.id}/expenses/${expenseId}`,
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ id: expenseId });
        expect(
          yield* app.db.query(
            'select count(*)::int as count from quick_split_expense',
          ),
        ).toEqual([{ count: 0 }]);
      }),
    );

    testEffect('is not allowed for users outside the quick split', () =>
      Effect.gen(function* () {
        const { app, carla, split, expenseId } = yield* withExpense();

        const response = yield* carla.device.delete(
          `/api/quick-splits/${split.id}/expenses/${expenseId}`,
        );

        expect(response.status).toBe(404);
        expect(response.body._tag).toBe('QuickSplitExpenseNotFound');
        expect(
          yield* app.db.query(
            'select count(*)::int as count from quick_split_expense',
          ),
        ).toEqual([{ count: 1 }]);
      }),
    );
  });
});
