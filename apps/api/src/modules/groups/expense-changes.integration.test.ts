import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { bodyOf, expense, trip } from './test-support';

const DENIED = {
  _tag: 'GroupAccessDenied',
  error: 'No tienes acceso a este grupo',
};
type Detail = {
  splitMethod: string;
  isDeleted: boolean;
  paidByMembers: { memberId: string; name: string; amount: number }[];
  participants: { memberId: string; name: string; share: number }[];
  lineItems: { memberId: string; description: string; amount: number }[];
  sharedSplit: unknown;
  advancedDetails: Record<string, unknown> | null;
  tags: string[];
};

describe('group expense changes', () => {
  describe('update', () => {
    testEffect('rewrites the expense and moves the group totals', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember, brunoMember } = yield* trip(app);
        const created = yield* ana.device.post(
          `/api/groups/${group}/expenses`,
          expense({
            paidById: anaMember,
            participantIds: [anaMember, brunoMember],
            splitMethod: 'exact',
            exactShares: { [anaMember]: 40, [brunoMember]: 60 },
            lineItems: [
              { memberId: anaMember, description: 'Pizza', amount: 40 },
            ],
          }),
        );
        const path = `/api/groups/${group}/expenses/${created.body.id}`;

        const updated = yield* ana.device.put(
          path,
          expense({
            description: 'Cena grande',
            amount: 200,
            currency: 'USD',
            paidById: brunoMember,
            participantIds: [anaMember],
          }),
        );
        const detail = bodyOf<Detail & { description: string }>(
          yield* ana.device.get(path),
        );

        expect(updated.body).toEqual({ id: created.body.id });
        expect(detail).toMatchObject({
          description: 'Cena grande',
          paidByMembers: [{ memberId: brunoMember, amount: 200 }],
          participants: [{ memberId: anaMember, share: 200 }],
        });
        expect(
          yield* app.db.query('select totals from "group" where id = $1', [
            group,
          ]),
        ).toEqual([{ totals: { USD: 200 } }]);
      }),
    );

    testEffect(
      'answers 400 for a missing or deleted expense, as the old routes did',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember } = yield* trip(app);
          const created = yield* ana.device.post(
            `/api/groups/${group}/expenses`,
            expense({ paidById: anaMember }),
          );
          const path = `/api/groups/${group}/expenses`;
          yield* ana.device.delete(`${path}/${created.body.id}`);
          const body = expense({ paidById: anaMember });

          const missing = yield* ana.device.put(`${path}/unknown`, body);
          const deleted = yield* ana.device.put(
            `${path}/${created.body.id}`,
            body,
          );
          const read = yield* ana.device.get(`${path}/unknown`);

          expect([missing.status, missing.body]).toEqual([
            400,
            { _tag: 'GroupExpenseNotFound', error: 'Gasto no encontrado' },
          ]);
          expect([deleted.status, deleted.body]).toEqual([
            400,
            {
              _tag: 'GroupExpenseDeleted',
              error: 'No puedes editar un gasto eliminado',
            },
          ]);
          expect([read.status, read.body._tag]).toEqual([
            404,
            'GroupExpenseNotFound',
          ]);
        }),
    );

    testEffect(
      'rolls everything back when the kept line items no longer match',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember, brunoMember } = yield* trip(app);
          const created = yield* ana.device.post(
            `/api/groups/${group}/expenses`,
            expense({
              paidById: anaMember,
              participantIds: [anaMember, brunoMember],
              splitMethod: 'exact',
              exactShares: { [anaMember]: 40, [brunoMember]: 60 },
              lineItems: [
                { memberId: brunoMember, description: 'Vino', amount: 60 },
              ],
            }),
          );

          const response = yield* ana.device.put(
            `/api/groups/${group}/expenses/${created.body.id}`,
            expense({
              amount: 999,
              paidById: anaMember,
              participantIds: [anaMember],
            }),
          );

          expect([response.status, response.body]).toEqual([
            400,
            {
              _tag: 'GroupExpenseLineItemsInvalid',
              error: 'No se pudo relacionar el desglose con sus participantes',
            },
          ]);
          expect(yield* app.db.query('select amount from expense')).toEqual([
            { amount: 100 },
          ]);
          expect(
            yield* app.db.query(
              'select count(*)::int as count from expense_participant',
            ),
          ).toEqual([{ count: 2 }]);
        }),
    );

    testEffect("can't be done by someone outside the group", () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');
        const created = yield* ana.device.post(
          `/api/groups/${group}/expenses`,
          expense({ paidById: anaMember }),
        );
        const path = `/api/groups/${group}/expenses/${created.body.id}`;

        const update = yield* carla.device.put(
          path,
          expense({ paidById: anaMember, amount: 1 }),
        );
        const remove = yield* carla.device.delete(path);

        expect([update, remove].map((r) => [r.status, r.body])).toEqual([
          [400, DENIED],
          [400, DENIED],
        ]);
        expect(
          yield* app.db.query('select amount, status from expense'),
        ).toEqual([{ amount: 100, status: 'ACTIVE' }]);
      }),
    );
  });

  describe('delete', () => {
    testEffect(
      'marks the expense as deleted once and takes it out of the totals',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember } = yield* trip(app);
          const created = yield* ana.device.post(
            `/api/groups/${group}/expenses`,
            expense({ paidById: anaMember }),
          );
          const path = `/api/groups/${group}/expenses/${created.body.id}`;

          const first = yield* ana.device.delete(path);
          const again = yield* ana.device.delete(path);
          const unknown = yield* ana.device.delete(
            `/api/groups/${group}/expenses/unknown`,
          );
          const detail = yield* ana.device.get(path);

          expect([first.body, again.body]).toEqual([
            { id: created.body.id },
            { id: created.body.id },
          ]);
          expect([unknown.status, unknown.body._tag]).toEqual([
            400,
            'GroupExpenseNotFound',
          ]);
          expect(bodyOf<Detail>(detail).isDeleted).toBe(true);
          expect(
            yield* app.db.query('select status, "deletedById" from expense'),
          ).toEqual([{ status: 'DELETED', deletedById: ana.id }]);
          expect(
            yield* app.db.query('select totals from "group" where id = $1', [
              group,
            ]),
          ).toEqual([{ totals: { COP: 0 } }]);
        }),
    );
  });

  describe('settlements', () => {
    testEffect('records a payment between two members', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember, brunoMember } = yield* trip(app);

        const response = yield* ana.device.post(
          `/api/groups/${group}/settlements`,
          {
            fromMemberId: brunoMember,
            toMemberId: anaMember,
            amount: 30,
            currency: 'COP',
          },
        );
        const summary = yield* ana.device.get(`/api/groups/${group}`);

        expect(response.status).toBe(201);
        expect(response.body).toEqual({ id: expect.any(String) });
        expect(summary.body.memberBalances).toEqual([
          expect.objectContaining({
            memberId: anaMember,
            balances: { COP: -30 },
          }),
          expect.objectContaining({
            memberId: brunoMember,
            balances: { COP: 30 },
          }),
        ]);
        expect(summary.body.totals).toEqual({});
      }),
    );

    testEffect('refuses unknown or identical participants and outsiders', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');
        const path = `/api/groups/${group}/settlements`;
        const settle = (device: typeof ana.device, from: string, to: string) =>
          device.post(path, {
            fromMemberId: from,
            toMemberId: to,
            amount: 5,
            currency: 'COP',
          });

        const same = yield* settle(ana.device, anaMember, anaMember);
        const unknown = yield* settle(ana.device, anaMember, 'unknown');
        const outsider = yield* settle(carla.device, anaMember, 'unknown');

        expect([same, unknown].map((r) => [r.status, r.body])).toEqual([
          [
            400,
            {
              _tag: 'GroupSettlementParticipantsInvalid',
              error: 'Participantes de liquidación inválidos',
            },
          ],
          [
            400,
            {
              _tag: 'GroupSettlementParticipantsInvalid',
              error: 'Participantes de liquidación inválidos',
            },
          ],
        ]);
        expect([outsider.status, outsider.body]).toEqual([400, DENIED]);
      }),
    );
  });
});
