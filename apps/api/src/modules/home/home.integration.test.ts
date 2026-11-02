import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const seedGroup = (
  app: TestApp,
  group: {
    readonly id: string;
    readonly ownerId: string;
    readonly name: string;
  },
) =>
  app.db.query(
    `insert into "group" ("id", "name", "type", "createdAt", "updatedAt", "ownerId", "inviteCode")
     values ($1, $2, 'trip', '2026-11-01T00:00:00Z', '2026-11-01T00:00:00Z', $3, $1)`,
    [group.id, group.name, group.ownerId],
  );

const seedMember = (
  app: TestApp,
  member: {
    readonly id: string;
    readonly userId: string;
    readonly groupId: string;
    readonly name: string;
  },
) =>
  app.db.query(
    `insert into group_member ("id", "userId", "groupId", "name") values ($1, $2, $3, $4)`,
    [member.id, member.userId, member.groupId, member.name],
  );

const seedDebt = (
  app: TestApp,
  debt: {
    readonly id: string;
    readonly ownerId: string;
    readonly counterpartyId: string | null;
    readonly updatedAt: string;
  },
) =>
  app.db.query(
    `insert into debt ("id", "name", "ownerId", "counterpartyId", "counterpartyName", "direction", "principalAmount", "expectedTotal", "currency", "updatedAt")
     values ($1, $1, $2, $3, 'Carla', 'lent', 100, 100, 'EUR', $4)`,
    [debt.id, debt.ownerId, debt.counterpartyId, debt.updatedAt],
  );

describe('home', () => {
  testEffect('requires a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      expect((yield* app.fetch('/api/home')).status).toBe(401);
    }),
  );

  testEffect('is empty for a user with no groups, goals or debts', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      const result = yield* ana.device.get('/api/home');

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ groups: [], goals: [], recentDebts: [] });
    }),
  );

  testEffect('shows only what the signed-in user takes part in', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      const bruno = yield* signIn(app, 'bruno@vornway.test');

      yield* seedGroup(app, { id: 'trip', ownerId: ana.id, name: 'Trip' });
      yield* seedMember(app, {
        id: 'm-ana',
        userId: ana.id,
        groupId: 'trip',
        name: 'Ana',
      });
      yield* seedMember(app, {
        id: 'm-bruno',
        userId: bruno.id,
        groupId: 'trip',
        name: 'Bruno',
      });
      yield* app.db.query(
        `insert into goal ("id", "groupId", "createdByMemberId", "title", "currency", "targetAmount", "startDate", "endDate", "installmentCount", "installmentAmount", "updatedAt")
         values ('fund', 'trip', 'm-ana', 'Fund', 'EUR', 200, '2026-11-01Z', '2026-12-31Z', 1, 200, '2026-11-01Z')`,
      );
      yield* seedGroup(app, {
        id: 'private',
        ownerId: bruno.id,
        name: 'Private',
      });
      yield* seedMember(app, {
        id: 'm-private',
        userId: bruno.id,
        groupId: 'private',
        name: 'Bruno',
      });
      yield* seedDebt(app, {
        id: 'owed-to-ana',
        ownerId: ana.id,
        counterpartyId: null,
        updatedAt: '2026-11-02Z',
      });
      yield* seedDebt(app, {
        id: 'ana-owes',
        ownerId: bruno.id,
        counterpartyId: ana.id,
        updatedAt: '2026-11-03Z',
      });
      yield* seedDebt(app, {
        id: 'not-theirs',
        ownerId: bruno.id,
        counterpartyId: null,
        updatedAt: '2026-11-04Z',
      });

      const result = yield* ana.device.get('/api/home');

      expect(result.body).toMatchObject({
        groups: [
          {
            id: 'trip',
            name: 'Trip',
            hasExpenses: false,
            members: [
              { id: 'm-bruno', name: 'Bruno' },
              { id: 'm-ana', name: 'Ana' },
            ],
            currentUser: { memberId: 'm-ana', name: 'Ana' },
            participantBalances: [],
            totalsByCurrency: {},
          },
        ],
        goals: [
          {
            id: 'fund',
            title: 'Fund',
            currency: 'EUR',
            targetAmount: 200,
            savedAmount: 0,
            progress: 0,
            group: { id: 'trip', name: 'Trip' },
          },
        ],
        recentDebts: [
          {
            id: 'ana-owes',
            direction: 'borrowed',
            status: 'active',
            remainingAmount: 100,
          },
          {
            id: 'owed-to-ana',
            direction: 'lent',
            status: 'active',
            remainingAmount: 100,
          },
        ],
      });
    }),
  );
});
