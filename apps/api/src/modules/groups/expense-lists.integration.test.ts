import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import {
  bodyOf,
  createExpense,
  createGroup,
  memberIdOf,
  type Paged,
  trip,
  walkPages,
} from './test-support';

const NOT_FOUND = { _tag: 'GroupNotFound', error: 'Grupo no encontrado' };
type Item = Record<string, unknown> & {
  id: string;
  description: string;
  amount: number;
  isSettlement: boolean;
  isPersonal: boolean;
  settlementToName: string | null;
  currentUserBalance: number | null;
  participants?: { memberId: string }[];
};
type MemberPage = Paged<Item> & {
  summary: {
    spentByCurrency: Record<string, number>;
    grossPaidByCurrency: Record<string, number>;
  };
};

describe('group expense lists', () => {
  describe('list', () => {
    testEffect(
      'pages through the expenses of the group without gaps or repeats',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember } = yield* trip(app);
          const other = (yield* createGroup(ana.device, { name: 'Otro' })).id;
          const otherMember = yield* memberIdOf(app, other, ana.id);
          const created: string[] = [];
          for (const description of ['a', 'b', 'c', 'd', 'e']) {
            created.push(
              yield* createExpense(ana.device, group, {
                description,
                paidById: anaMember,
              }),
            );
          }
          yield* createExpense(ana.device, other, { paidById: otherMember });

          const walked = yield* walkPages(
            ana.device,
            `/api/groups/${group}/expenses`,
            2,
          );

          expect(walked.pages).toBe(3);
          expect(walked.totals).toEqual([5, 5, 5]);
          expect([...walked.ids].sort()).toEqual([...created].sort());
        }),
    );

    testEffect(
      "shows each person's balance, flags settlements and hides deleted expenses",
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, bruno, group, anaMember, brunoMember } =
            yield* trip(app);
          const dinner = yield* createExpense(ana.device, group, {
            description: 'Cena',
            paidById: anaMember,
            participantIds: [anaMember, brunoMember],
          });
          yield* createExpense(ana.device, group, {
            description: 'Propio',
            paidById: anaMember,
          });
          const gone = yield* createExpense(ana.device, group, {
            description: 'Borrado',
            paidById: anaMember,
          });
          yield* ana.device.delete(`/api/groups/${group}/expenses/${gone}`);
          yield* bruno.device.post(`/api/groups/${group}/settlements`, {
            fromMemberId: brunoMember,
            toMemberId: anaMember,
            amount: 20,
            currency: 'COP',
          });
          const byDescription = (page: Paged<Item>) =>
            Object.fromEntries(
              page.data.map((item) => [item.description, item]),
            );

          const asAna = bodyOf<Paged<Item>>(
            yield* ana.device.get(`/api/groups/${group}/expenses`),
          );
          const asBruno = bodyOf<Paged<Item>>(
            yield* bruno.device.get(`/api/groups/${group}/expenses`),
          );

          expect(asAna.pagination.total).toBe(3);
          expect(asAna.data.map((item) => item.id)).not.toContain(gone);
          expect(byDescription(asAna).Cena).toMatchObject({
            id: dinner,
            currentUserBalance: 50,
            isPersonal: false,
            isSettlement: false,
          });
          expect(byDescription(asBruno).Cena?.currentUserBalance).toBe(-50);
          expect(byDescription(asAna).Propio).toMatchObject({
            isPersonal: true,
            currentUserBalance: null,
          });
          const settlement = asAna.data.find((item) => item.isSettlement);
          expect(settlement).toMatchObject({
            settlementToName: expect.any(String),
          });
          expect(byDescription(asAna).Cena).toEqual({
            id: dinner,
            description: 'Cena',
            amount: 100,
            attachmentUrl: null,
            currency: 'COP',
            date: expect.any(String),
            isDeleted: false,
            isSettlement: false,
            isPersonal: false,
            expenseType: 'standard',
            subExpenseCount: 0,
            settlementToName: null,
            paidBy: { id: anaMember, name: expect.any(String) },
            paidByMembers: [
              { memberId: anaMember, name: expect.any(String), amount: 100 },
            ],
            category: null,
            participantCount: 2,
            currentUserBalance: 50,
            tags: [],
          });
        }),
    );

    testEffect("never shows another group's expenses to an outsider", () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');
        const created = yield* createExpense(ana.device, group, {
          paidById: anaMember,
        });

        const list = yield* carla.device.get(`/api/groups/${group}/expenses`);
        const detail = yield* carla.device.get(
          `/api/groups/${group}/expenses/${created}`,
        );
        const member = yield* carla.device.get(
          `/api/groups/${group}/members/${anaMember}/expenses`,
        );

        expect([list, detail, member].map((r) => [r.status, r.body])).toEqual([
          [404, NOT_FOUND],
          [404, NOT_FOUND],
          [404, NOT_FOUND],
        ]);
      }),
    );

    testEffect(
      'does not serve an expense through a group it does not belong to',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember } = yield* trip(app);
          const other = (yield* createGroup(ana.device, { name: 'Otro' })).id;
          const created = yield* createExpense(ana.device, group, {
            paidById: anaMember,
          });

          const response = yield* ana.device.get(
            `/api/groups/${other}/expenses/${created}`,
          );

          expect([response.status, response.body._tag]).toEqual([
            404,
            'GroupExpenseNotFound',
          ]);
        }),
    );

    testEffect('rejects invalid paging', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group } = yield* trip(app);

        for (const query of ['limit=0', 'limit=101', 'limit=abc']) {
          const response = yield* ana.device.get(
            `/api/groups/${group}/expenses?${query}`,
          );
          expect([response.status, response.body._tag]).toEqual([
            400,
            'InvalidRequest',
          ]);
        }
      }),
    );
  });

  describe('by member', () => {
    testEffect('lists what a member paid or shares, with their totals', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember, brunoMember } = yield* trip(app);
        const food = (yield* ana.device.post(
          `/api/groups/${group}/categories`,
          {
            name: 'Comida',
          },
        )).body.id;
        const paidByAna = yield* createExpense(ana.device, group, {
          description: 'Cena',
          amount: 100,
          paidById: anaMember,
          participantIds: [anaMember, brunoMember],
          categoryId: food,
        });
        const paidByBruno = yield* createExpense(ana.device, group, {
          description: 'Taxi',
          amount: 40,
          paidById: brunoMember,
          participantIds: [anaMember, brunoMember],
        });
        yield* createExpense(ana.device, group, {
          description: 'Solo Ana',
          paidById: anaMember,
          participantIds: [anaMember],
        });
        const path = `/api/groups/${group}/members/${brunoMember}/expenses`;
        const read = (query = '') =>
          ana.device
            .get(`${path}${query}`)
            .pipe(Effect.map((r) => bodyOf<MemberPage>(r)));

        const everything = yield* read();
        const paidOnly = yield* read('?paidOnly=true');
        const categorized = yield* read(`?categoryId=${food}`);
        const uncategorized = yield* read('?uncategorized=true');

        expect([...everything.data.map((i) => i.id)].sort()).toEqual(
          [paidByAna, paidByBruno].sort(),
        );
        expect(everything.pagination).toEqual({
          limit: 20,
          total: 2,
          nextCursor: null,
        });
        expect(everything.summary).toEqual({
          spentByCurrency: { COP: 70 },
          grossPaidByCurrency: { COP: 40 },
        });
        expect(everything.data[0]?.participants).toHaveLength(2);
        expect(paidOnly.data.map((i) => i.id)).toEqual([paidByBruno]);
        expect(categorized.data.map((i) => i.id)).toEqual([paidByAna]);
        expect(uncategorized.data.map((i) => i.id)).toEqual([paidByBruno]);
        expect(categorized.summary.spentByCurrency).toEqual({ COP: 50 });
      }),
    );

    testEffect('filters by date range and pages through the results', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const ids: string[] = [];
        for (const description of ['a', 'b', 'c']) {
          ids.push(
            yield* createExpense(ana.device, group, {
              description,
              paidById: anaMember,
              participantIds: [anaMember],
            }),
          );
        }
        yield* app.db.query(
          `update expense set date = '2026-01-01T00:00:00Z' where id = $1`,
          [ids[0]],
        );
        const path = `/api/groups/${group}/members/${anaMember}/expenses`;

        const old = bodyOf<MemberPage>(
          yield* ana.device.get(
            `${path}?startDate=2025-12-31T00:00:00Z&endDate=2026-01-02T00:00:00Z`,
          ),
        );
        const walked = yield* walkPages(ana.device, path, 2);

        expect(old.data.map((i) => i.id)).toEqual([ids[0]]);
        expect(walked.pages).toBe(2);
        expect(walked.totals).toEqual([3, 3]);
        expect([...walked.ids].sort()).toEqual([...ids].sort());
      }),
    );

    testEffect('refuses unknown members and malformed filters', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const path = `/api/groups/${group}/members/${anaMember}/expenses`;

        const unknown = yield* ana.device.get(
          `/api/groups/${group}/members/unknown/expenses`,
        );
        const invalid = [
          '?startDate=yesterday',
          '?startDate=2026-02-01T00:00:00Z&endDate=2026-01-01T00:00:00Z',
          '?uncategorized=maybe',
        ];

        expect([unknown.status, unknown.body]).toEqual([
          400,
          { _tag: 'GroupMemberNotFound', error: 'Participante no encontrado' },
        ]);
        for (const query of invalid) {
          const response = yield* ana.device.get(`${path}${query}`);
          expect([response.status, response.body._tag]).toEqual([
            400,
            'InvalidRequest',
          ]);
        }
      }),
    );
  });
});
