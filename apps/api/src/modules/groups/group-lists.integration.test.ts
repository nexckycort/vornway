import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import {
  bodyOf,
  createExpense,
  createGroup,
  type Paged,
  trip,
  walkPages,
} from './test-support';

type Named = { id: string; name: string };
const NOT_FOUND = { _tag: 'GroupNotFound', error: 'Grupo no encontrado' };

describe('group lists', () => {
  describe('list', () => {
    testEffect('pages through the groups of the caller only', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');
        const created: string[] = [];
        for (const name of ['Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco']) {
          created.push((yield* createGroup(ana.device, { name })).id);
        }
        yield* createGroup(bruno.device, { name: 'De Bruno' });

        const walked = yield* walkPages(ana.device, '/api/groups', 2);

        expect(walked.pages).toBe(3);
        expect(walked.totals).toEqual([5, 5, 5]);
        expect([...walked.ids].sort()).toEqual([...created].sort());
      }),
    );

    testEffect('filters by name and by who owes whom', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, bruno, group, anaMember, brunoMember } = yield* trip(app);
        yield* createGroup(ana.device, { name: 'Sin deudas' });
        yield* createExpense(ana.device, group, {
          paidById: anaMember,
          participantIds: [anaMember, brunoMember],
        });
        const names = (page: { body: Record<string, unknown> }) =>
          bodyOf<Paged<Named>>(page).data.map((item) => item.name);

        const byName = yield* ana.device.get('/api/groups?search=sin');
        const credits = yield* ana.device.get('/api/groups?filter=theyOweYou');
        const debts = yield* bruno.device.get('/api/groups?filter=youOweThem');
        const settled = yield* ana.device.get('/api/groups?filter=noDebt');
        const nobody = yield* ana.device.get('/api/groups?filter=youOweThem');

        expect(names(byName)).toEqual(['Sin deudas']);
        expect(names(credits)).toEqual(['Viaje']);
        expect(credits.body.pagination).toEqual({
          limit: 20,
          total: 1,
          nextCursor: null,
        });
        expect(
          bodyOf<Paged<{ participantBalances: unknown[] }>>(credits).data[0]
            ?.participantBalances,
        ).toEqual([
          {
            memberId: brunoMember,
            memberName: 'Bruno',
            currency: 'COP',
            amount: 50,
            direction: 'theyOweYou',
            label: expect.stringContaining('Te debe'),
          },
        ]);
        expect(names(debts)).toEqual(['Viaje']);
        expect(names(settled)).toEqual(['Sin deudas']);
        expect(nobody.body).toEqual({
          data: [],
          pagination: { limit: 20, total: 0, nextCursor: null },
        });
      }),
    );

    testEffect('pages through a filtered list', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const created: string[] = [];
        for (const name of ['Uno', 'Dos', 'Tres']) {
          created.push((yield* createGroup(ana.device, { name })).id);
        }

        const walked = yield* walkPages(
          ana.device,
          '/api/groups?filter=noDebt',
          2,
        );

        expect(walked.pages).toBe(2);
        expect(walked.totals).toEqual([3, 3]);
        expect([...walked.ids].sort()).toEqual([...created].sort());
      }),
    );

    testEffect('rejects invalid queries', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        for (const query of [
          'limit=0',
          'limit=101',
          'filter=bogus',
          'search=%20',
        ]) {
          const response = yield* ana.device.get(`/api/groups?${query}`);
          expect(response.status).toBe(400);
          expect(response.body._tag).toBe('InvalidRequest');
        }
      }),
    );
  });

  describe('get', () => {
    testEffect('summarizes members, categories and balances', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, bruno, group, anaMember, brunoMember } = yield* trip(app);
        const category = yield* ana.device.post(
          `/api/groups/${group}/categories`,
          { name: 'Comida' },
        );
        yield* createExpense(ana.device, group, {
          paidById: anaMember,
          participantIds: [anaMember, brunoMember],
          categoryId: category.body.id,
        });

        const summary = yield* bruno.device.get(`/api/groups/${group}`);

        expect(summary.status).toBe(200);
        expect(summary.body).toMatchObject({
          id: group,
          name: 'Viaje',
          ownerId: ana.id,
          isOwner: false,
          participantCount: 2,
          totals: { COP: 100 },
          categories: [
            { id: category.body.id, name: 'Comida', expenseCount: 1 },
          ],
          myMembership: { id: brunoMember, role: 'member' },
          memberBalances: [
            {
              memberId: anaMember,
              isCurrentUser: false,
              balances: { COP: 50 },
            },
            {
              memberId: brunoMember,
              isCurrentUser: true,
              balances: { COP: -50 },
            },
          ],
          directDebts: [{ toMemberId: anaMember, currency: 'COP', amount: 50 }],
          directCredits: [],
          settlementDebts: [
            {
              fromMemberId: brunoMember,
              toMemberId: anaMember,
              currency: 'COP',
              amount: 50,
            },
          ],
        });
        expect(summary.body.members).toHaveLength(2);
      }),
    );

    testEffect("does not show a group to someone who isn't in it", () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const carla = yield* signIn(app, 'carla@vornway.test');
        const { id } = yield* createGroup(ana.device);

        const hidden = yield* carla.device.get(`/api/groups/${id}`);
        const unknown = yield* carla.device.get('/api/groups/unknown');

        expect([hidden, unknown].map((r) => [r.status, r.body])).toEqual([
          [404, NOT_FOUND],
          [404, NOT_FOUND],
        ]);
      }),
    );
  });
});
