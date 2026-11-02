import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { type Device, makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const newGoal = (overrides: Record<string, unknown> = {}) => ({
  name: 'Viaje',
  currency: 'COP',
  targetAmount: 1000,
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  installmentCount: 4,
  ...overrides,
});

const setup = Effect.gen(function* () {
  const app = yield* makeTestApp();
  const ana = yield* signIn(app, 'ana@vornway.test');
  const bea = yield* signIn(app, 'bea@vornway.test');
  return { app, ana, bea };
});

type Detail = {
  completedAt: string | null;
  savedAmount: number;
  myMembership: { id: string; name: string; role: string };
  members: { id: string; name: string; role: string; isCurrentUser: boolean }[];
  memberStats: { memberId: string }[];
  contributions: { id: string }[];
};

const getDetail = (user: { device: Device }, id: string) =>
  user.device.get(`/api/goals/${id}`).pipe(
    Effect.map((response) => ({
      status: response.status,
      body: response.body as Detail,
    })),
  );

const createGoal = (
  user: { device: Device },
  overrides: Record<string, unknown> = {},
) =>
  Effect.gen(function* () {
    const response = yield* user.device.post('/api/goals', newGoal(overrides));
    expect(response.status).toBe(201);
    return (response.body as { id: string }).id;
  });

describe('goals', () => {
  testEffect('requires a session on every endpoint', () =>
    Effect.gen(function* () {
      const { app } = yield* setup;
      const json = (method: string, body?: unknown) => ({
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      for (const [path, init] of [
        ['/api/goals', json('GET')],
        ['/api/goals/g1', json('GET')],
        ['/api/goals', json('POST', newGoal())],
        ['/api/goals/g1', json('PATCH', {})],
        [
          '/api/goals/g1/contributions',
          json('POST', { memberId: 'm', amount: 1 }),
        ],
        ['/api/goals/g1/contributions/c1', json('DELETE')],
      ] as const) {
        expect((yield* app.fetch(path, init)).status).toBe(401);
      }
    }),
  );

  testEffect('rejects invalid requests with 400', () =>
    Effect.gen(function* () {
      const { ana } = yield* setup;
      const post = (overrides: Record<string, unknown>) =>
        ana.device.post('/api/goals', newGoal(overrides));
      for (const overrides of [
        { name: '' },
        { targetAmount: 0 },
        { installmentCount: 1.5 },
        { goalType: 'party' },
        { startDate: 'not a date' },
        { installmentAmount: -1 },
      ]) {
        const response = yield* post(overrides);
        expect(response.status).toBe(400);
        expect(response.body._tag).toBe('InvalidRequest');
      }
      expect((yield* ana.device.get('/api/goals?limit=51')).status).toBe(400);
      expect((yield* ana.device.get('/api/goals?search=%20%20')).status).toBe(
        400,
      );
    }),
  );

  testEffect('creates a goal with its group, members and activity', () =>
    Effect.gen(function* () {
      const { app, ana } = yield* setup;
      const id = yield* createGoal(ana, {
        name: '  Viaje  ',
        emoji: ' ✈️ ',
        participants: [
          { name: ' Luis ' },
          { name: 'luis' },
          { name: 'Ana', userId: ana.id },
          { name: '   ' },
        ],
      });

      const detail = yield* getDetail(ana, id);
      expect(detail.status).toBe(200);
      expect(detail.body).toMatchObject({
        id,
        title: 'Viaje',
        emoji: '✈️',
        goalType: 'saving',
        contributionMode: 'manual',
        currency: 'COP',
        targetAmount: 1000,
        savedAmount: 0,
        progress: 0,
        installmentAmount: 250,
        monthlyTarget: 250,
        perMemberMonthlyTarget: 125,
        participantCount: 2,
        completedAt: null,
        startDate: '2026-01-01T00:00:00.000Z',
        group: { name: 'Viaje', type: 'meta' },
        myMembership: { role: 'admin' },
        contributions: [],
        stats: { remainingAmount: 1000, projectedCompletionDate: null },
      });
      expect(
        detail.body.members.map((member) => [
          member.name,
          member.role,
          member.isCurrentUser,
        ]),
      ).toEqual([
        ['Usuario', 'admin', true],
        ['Luis', 'member', false],
      ]);

      const activity = yield* app.db.query(
        'select action, "targetName", "actorUserId" from activity_log',
        [],
      );
      expect(activity).toEqual([
        { action: 'goal.created', targetName: 'Viaje', actorUserId: ana.id },
      ]);
    }),
  );

  testEffect('rejects a whitespace-only name with the old error body', () =>
    Effect.gen(function* () {
      const { ana } = yield* setup;
      const created = yield* ana.device.post(
        '/api/goals',
        newGoal({ name: '   ' }),
      );
      expect(created.status).toBe(400);
      expect(created.body).toEqual({
        _tag: 'GoalNameRequired',
        error: 'El nombre de la meta es obligatorio',
      });
      const id = yield* createGoal(ana);
      const updated = yield* ana.device.patch(`/api/goals/${id}`, {
        name: '   ',
      });
      expect(updated.status).toBe(400);
      expect(updated.body._tag).toBe('GoalNameRequired');
    }),
  );

  testEffect('isolates goals between users', () =>
    Effect.gen(function* () {
      const { ana, bea } = yield* setup;
      const id = yield* createGoal(ana);
      const missing = { _tag: 'GoalNotFound', error: 'Meta no encontrada' };

      const read = yield* bea.device.get(`/api/goals/${id}`);
      expect(read.status).toBe(404);
      expect(read.body).toEqual(missing);
      const patch = yield* bea.device.patch(`/api/goals/${id}`, { name: 'x' });
      expect(patch.status).toBe(404);
      expect(patch.body).toEqual(missing);
      const add = yield* bea.device.post(`/api/goals/${id}/contributions`, {
        memberId: 'whatever',
        amount: 10,
      });
      expect(add.status).toBe(404);
      expect(add.body).toEqual(missing);
      const remove = yield* bea.device.delete(
        `/api/goals/${id}/contributions/whatever`,
      );
      expect(remove.status).toBe(404);
      expect(remove.body).toEqual(missing);

      const list = yield* bea.device.get('/api/goals');
      expect(list.body).toEqual({
        data: [],
        pagination: { limit: 12, total: 0, nextCursor: null },
      });
      expect((yield* ana.device.get(`/api/goals/${id}`)).status).toBe(200);
    }),
  );

  testEffect('lets members read but only admins change a goal', () =>
    Effect.gen(function* () {
      const { app, ana, bea } = yield* setup;
      const id = yield* createGoal(ana, {
        participants: [{ name: 'Bea', userId: bea.id }],
      });
      const detail = yield* getDetail(bea, id);
      expect(detail.status).toBe(200);
      expect(detail.body.myMembership).toMatchObject({ role: 'member' });

      expect(
        (yield* bea.device.patch(`/api/goals/${id}`, { name: 'x' })).status,
      ).toBe(404);
      const add = yield* bea.device.post(`/api/goals/${id}/contributions`, {
        memberId: detail.body.myMembership.id,
        amount: 10,
      });
      expect(add.status).toBe(403);
      expect(add.body).toEqual({
        _tag: 'GoalContributionCreateForbidden',
        error: 'Solo un admin puede registrar aportes',
      });

      const contribution = yield* ana.device.post(
        `/api/goals/${id}/contributions`,
        { memberId: detail.body.myMembership.id, amount: 10 },
      );
      const remove = yield* bea.device.delete(
        `/api/goals/${id}/contributions/${contribution.body.id}`,
      );
      expect(remove.status).toBe(403);
      expect(remove.body).toEqual({
        _tag: 'GoalContributionDeleteForbidden',
        error: 'Solo un admin puede eliminar aportes',
      });
      const rows = yield* app.db.query(
        'select count(*)::int as count from goal_contribution',
        [],
      );
      expect(rows).toEqual([{ count: 1 }]);
    }),
  );

  testEffect('updates only the fields sent', () =>
    Effect.gen(function* () {
      const { app, ana } = yield* setup;
      const id = yield* createGoal(ana, {
        goalType: 'trip',
        contributionMode: 'monthly',
        description: 'Desc',
      });
      const updated = yield* ana.device.patch(`/api/goals/${id}`, {
        name: ' Nuevo ',
        currency: 'usd',
        description: '',
        targetAmount: 2000,
      });
      expect(updated.status).toBe(200);
      expect(updated.body).toEqual({ id });

      const detail = yield* getDetail(ana, id);
      expect(detail.body).toMatchObject({
        title: 'Nuevo',
        currency: 'USD',
        description: null,
        targetAmount: 2000,
        goalType: 'trip',
        contributionMode: 'monthly',
        installmentCount: 4,
        group: { name: 'Nuevo' },
      });
      expect(
        (yield* ana.device.patch('/api/goals/missing', {})).body,
      ).toMatchObject({ _tag: 'GoalNotFound' });
      const groups = yield* app.db.query('select name from "group"', []);
      expect(groups).toEqual([{ name: 'Nuevo' }]);
    }),
  );

  testEffect('adds and deletes contributions and tracks completion', () =>
    Effect.gen(function* () {
      const { app, ana } = yield* setup;
      const id = yield* createGoal(ana, {
        participants: [{ name: 'Luis' }],
      });
      const members = (yield* getDetail(ana, id)).body.members;
      const luis = members.find((member) => member.name === 'Luis');

      const invalid = yield* ana.device.post(`/api/goals/${id}/contributions`, {
        memberId: 'nobody',
        amount: 10,
      });
      expect(invalid.status).toBe(400);
      expect(invalid.body).toEqual({
        _tag: 'GoalParticipantInvalid',
        error: 'Participante inválido',
      });
      expect(
        (yield* ana.device.post(`/api/goals/${id}/contributions`, {
          memberId: luis?.id,
          amount: 0,
        })).status,
      ).toBe(400);

      const first = yield* ana.device.post(`/api/goals/${id}/contributions`, {
        memberId: luis?.id,
        amount: 400.5,
        notes: ' primero ',
        contributedAt: '2026-03-01T10:00:00.000Z',
      });
      expect(first.status).toBe(201);
      const second = yield* ana.device.post(`/api/goals/${id}/contributions`, {
        memberId: luis?.id,
        amount: 600,
      });
      expect(second.status).toBe(201);

      const full = yield* getDetail(ana, id);
      expect(full.body).toMatchObject({
        savedAmount: 1000.5,
        progress: 100,
        stats: { remainingAmount: 0, averageContribution: 500.25 },
      });
      expect(full.body.completedAt).not.toBeNull();
      expect(
        full.body.memberStats.find((stat) => stat.memberId === luis?.id),
      ).toMatchObject({ totalAmount: 1000.5, contributionCount: 2 });
      expect(full.body.contributions.at(-1)).toMatchObject({
        id: first.body.id,
        notes: 'primero',
        member: { name: 'Luis', isCurrentUser: false },
      });

      const missing = yield* ana.device.delete(
        `/api/goals/${id}/contributions/nope`,
      );
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({
        _tag: 'GoalContributionNotFound',
        error: 'Aporte no encontrado',
      });
      const removed = yield* ana.device.delete(
        `/api/goals/${id}/contributions/${second.body.id}`,
      );
      expect(removed.status).toBe(200);
      expect(removed.body).toEqual({ id: second.body.id });
      const reopened = yield* getDetail(ana, id);
      expect(reopened.body.completedAt).toBeNull();
      expect(reopened.body.savedAmount).toBe(400.5);

      const actions = yield* app.db.query(
        'select action from activity_log order by action',
        [],
      );
      expect(actions).toEqual([
        { action: 'goal.contribution.created' },
        { action: 'goal.contribution.created' },
        { action: 'goal.contribution.deleted' },
        { action: 'goal.created' },
      ]);
    }),
  );

  testEffect('denies contributions to an owner without a membership', () =>
    Effect.gen(function* () {
      const { app, ana } = yield* setup;
      yield* app.db.query(
        'insert into "group" (id, name, type, "createdAt", "updatedAt", "ownerId", "inviteCode") values ($1, $2, $3, now(), now(), $4, $5)',
        ['g1', 'Meta', 'meta', ana.id, 'code'],
      );
      yield* app.db.query(
        'insert into group_member (id, "groupId", name) values ($1, $2, $3)',
        ['m1', 'g1', 'Otro'],
      );
      yield* app.db.query(
        'insert into goal (id, "groupId", "createdByMemberId", title, currency, "targetAmount", "startDate", "endDate", "installmentCount", "installmentAmount", "updatedAt") values ($1, $2, $3, $4, $5, $6, now(), now(), $7, $8, now())',
        ['goal1', 'g1', 'm1', 'Meta', 'COP', 100, 1, 100],
      );
      const response = yield* ana.device.post(
        '/api/goals/goal1/contributions',
        { memberId: 'm1', amount: 10 },
      );
      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        _tag: 'GoalAccessDenied',
        error: 'No tienes acceso a esta meta',
      });
      const removed = yield* ana.device.delete(
        '/api/goals/goal1/contributions/c1',
      );
      expect(removed.status).toBe(403);
      expect(removed.body._tag).toBe('GoalAccessDenied');
    }),
  );

  testEffect('paginates the list and filters by search', () =>
    Effect.gen(function* () {
      const { ana } = yield* setup;
      const ids = [
        yield* createGoal(ana, { name: 'Playa' }),
        yield* createGoal(ana, { name: 'Montaña' }),
        yield* createGoal(ana, { name: 'Playa grande' }),
      ];

      const page = (query: string) =>
        ana.device.get(`/api/goals${query}`).pipe(
          Effect.map(
            (response) =>
              response.body as {
                data: { id: string }[];
                pagination: {
                  limit: number;
                  total: number;
                  nextCursor: string | null;
                };
              },
          ),
        );
      const first = yield* page('?limit=2');
      expect(first.data).toHaveLength(2);
      expect(first.pagination).toMatchObject({ limit: 2, total: 3 });
      expect(first.pagination.nextCursor).toBe(first.data[1]?.id ?? '');

      const second = yield* page(
        `?limit=2&cursor=${first.pagination.nextCursor}`,
      );
      expect(second.data).toHaveLength(1);
      expect(second.pagination).toEqual({
        limit: 2,
        total: 3,
        nextCursor: null,
      });
      expect(
        [...first.data, ...second.data].map((goal) => goal.id).sort(),
      ).toEqual([...ids].sort());

      const search = yield* page('?search=PLAYA');
      expect(search.data).toHaveLength(2);
      expect(search.pagination).toEqual({
        limit: 12,
        total: 2,
        nextCursor: null,
      });
    }),
  );
});
