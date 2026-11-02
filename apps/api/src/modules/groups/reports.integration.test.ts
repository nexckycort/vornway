import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { createExpense, createGroup, memberIdOf, trip } from './test-support';

const NOT_FOUND = { _tag: 'GroupNotFound', error: 'Grupo no encontrado' };

const withReportData = (app: Parameters<typeof trip>[0]) =>
  Effect.gen(function* () {
    const base = yield* trip(app);
    const { ana, group, anaMember, brunoMember } = base;
    const food = (yield* ana.device.post(`/api/groups/${group}/categories`, {
      name: 'Comida',
      color: '#112233',
    })).body.id as string;
    const both = [anaMember, brunoMember];
    yield* createExpense(ana.device, group, {
      description: 'Cena',
      paidById: anaMember,
      participantIds: both,
      categoryId: food,
    });
    const taxi = yield* createExpense(ana.device, group, {
      description: 'Taxi',
      amount: 40,
      paidById: brunoMember,
      participantIds: both,
    });
    yield* createExpense(ana.device, group, {
      description: 'Hotel',
      amount: 30,
      currency: 'USD',
      paidById: anaMember,
      participantIds: [anaMember],
    });
    yield* ana.device.post(`/api/groups/${group}/settlements`, {
      fromMemberId: brunoMember,
      toMemberId: anaMember,
      amount: 25,
      currency: 'COP',
    });
    const gone = yield* createExpense(ana.device, group, {
      amount: 999,
      paidById: anaMember,
      participantIds: both,
    });
    yield* ana.device.delete(`/api/groups/${group}/expenses/${gone}`);
    return { ...base, food, taxi };
  });

describe('group reports', () => {
  testEffect(
    'totals by currency, category and person, ignoring settlements and deleted expenses',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, food } = yield* withReportData(app);

        const response = yield* ana.device.get(
          `/api/groups/${group}/reports/totals`,
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          range: 'all',
          totalsByCurrency: { COP: 140, USD: 30 },
          expenseCountByCurrency: { COP: 2, USD: 1 },
          currentUserSpentByCurrency: { COP: 70, USD: 30 },
          categoriesByCurrency: {
            COP: [
              {
                key: food,
                id: food,
                name: 'Comida',
                icon: null,
                amount: 100,
                fill: '#112233',
              },
              {
                key: 'Sin categoría::',
                id: null,
                name: 'Sin categoría',
                icon: null,
                amount: 40,
                fill: expect.stringMatching(/^#[0-9a-f]{6}$/),
              },
            ],
            USD: [
              {
                key: 'Sin categoría::',
                id: null,
                name: 'Sin categoría',
                icon: null,
                amount: 30,
                fill: expect.any(String),
              },
            ],
          },
          tagsByCurrency: {},
        });
      }),
  );

  testEffect('totals only the expenses inside a custom range', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group, taxi } = yield* withReportData(app);
      yield* app.db.query(
        `update expense set date = '2026-01-01T12:00:00Z' where id = $1`,
        [taxi],
      );
      const range =
        'range=custom&startDate=2026-01-01T00:00:00Z&endDate=2026-01-02T00:00:00Z';

      const response = yield* ana.device.get(
        `/api/groups/${group}/reports/totals?${range}`,
      );

      expect(response.body).toMatchObject({
        range: 'custom',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-01-02T00:00:00Z',
        totalsByCurrency: { COP: 40 },
        expenseCountByCurrency: { COP: 1 },
      });
    }),
  );

  testEffect('counts tags and the whole spend on a personal group', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      const { id } = yield* createGroup(ana.device, { type: 'personal' });
      const member = yield* memberIdOf(app, id, ana.id);
      yield* createExpense(ana.device, id, {
        paidById: member,
        tags: ['Viaje', 'comida'],
      });
      yield* createExpense(ana.device, id, {
        amount: 50,
        paidById: member,
        tags: ['viaje'],
      });

      const response = yield* ana.device.get(
        `/api/groups/${id}/reports/totals`,
      );

      expect(response.body).toMatchObject({
        totalsByCurrency: { COP: 150 },
        currentUserSpentByCurrency: { COP: 150 },
        tagsByCurrency: {
          COP: [
            {
              key: 'viaje',
              name: 'viaje',
              amount: 150,
              fill: expect.any(String),
            },
            {
              key: 'comida',
              name: 'comida',
              amount: 100,
              fill: expect.any(String),
            },
          ],
        },
      });
    }),
  );

  testEffect('counts expenses by category, participants and currency', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group, food, brunoMember } = yield* withReportData(app);
      const path = `/api/groups/${group}/reports/category-count`;
      const count = (query: string) =>
        ana.device
          .get(`${path}?${query}`)
          .pipe(Effect.map((r) => r.body.expenseCount));

      expect(yield* count('currency=COP')).toBe(2);
      expect(yield* count('currency=USD')).toBe(1);
      expect(yield* count(`currency=COP&categoryId=${food}`)).toBe(1);
      expect(yield* count('currency=COP&uncategorized=true')).toBe(1);
      expect(yield* count(`currency=COP&participantIds=${brunoMember}`)).toBe(
        2,
      );
      expect(yield* count('currency=COP&participantIds=unknown,%20other')).toBe(
        0,
      );
      expect((yield* ana.device.get(`${path}?currency=COP`)).body).toEqual({
        range: 'all',
        expenseCount: 2,
      });
    }),
  );

  testEffect('balances: who is ahead and who is behind', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group, anaMember, brunoMember } = yield* withReportData(app);

      const response = yield* ana.device.get(
        `/api/groups/${group}/reports/balances`,
      );

      expect(response.body).toEqual({
        range: 'all',
        memberBalances: [
          {
            memberId: anaMember,
            name: expect.any(String),
            isCurrentUser: true,
            balances: { COP: 30, USD: 0 },
          },
          {
            memberId: brunoMember,
            name: 'Bruno',
            isCurrentUser: false,
            balances: { COP: -30 },
          },
        ],
      });
    }),
  );

  testEffect("shares: what each person's part of the spend is", () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group, food, anaMember, brunoMember } =
        yield* withReportData(app);

      const response = yield* ana.device.get(
        `/api/groups/${group}/reports/shares`,
      );

      expect(response.body).toEqual({
        range: 'all',
        memberShares: [
          {
            memberId: anaMember,
            name: expect.any(String),
            isCurrentUser: true,
            shares: { COP: 70, USD: 30 },
            categorySharesByCurrency: {
              COP: { [food]: 50, 'Sin categoría::': 20 },
              USD: { 'Sin categoría::': 30 },
            },
          },
          {
            memberId: brunoMember,
            name: 'Bruno',
            isCurrentUser: false,
            shares: { COP: 70 },
            categorySharesByCurrency: {
              COP: { [food]: 50, 'Sin categoría::': 20 },
            },
          },
        ],
      });
    }),
  );

  testEffect('are closed to people outside the group', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { group } = yield* withReportData(app);
      const carla = yield* signIn(app, 'carla@vornway.test');
      const base = `/api/groups/${group}/reports`;

      const responses = yield* Effect.all([
        carla.device.get(`${base}/totals`),
        carla.device.get(`${base}/category-count?currency=COP`),
        carla.device.get(`${base}/balances`),
        carla.device.get(`${base}/shares`),
      ]);

      expect(responses.map((r) => [r.status, r.body])).toEqual([
        [404, NOT_FOUND],
        [404, NOT_FOUND],
        [404, NOT_FOUND],
        [404, NOT_FOUND],
      ]);
    }),
  );

  testEffect('reject malformed ranges', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group } = yield* trip(app);
      const base = `/api/groups/${group}/reports`;

      for (const path of [
        `${base}/totals?range=custom`,
        `${base}/totals?range=custom&startDate=2026-01-01T00:00:00Z`,
        `${base}/balances?startDate=2026-02-01T00:00:00Z&endDate=2026-01-01T00:00:00Z`,
        `${base}/shares?range=weekly`,
        `${base}/shares?startDate=tomorrow`,
        `${base}/category-count`,
        `${base}/category-count?currency=`,
      ]) {
        const response = yield* ana.device.get(path);
        expect([response.status, response.body._tag]).toEqual([
          400,
          'InvalidRequest',
        ]);
      }
    }),
  );
});
