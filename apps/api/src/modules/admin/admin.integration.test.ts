import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const ADMIN = 'junior110120@gmail.com';
const REPORT = { type: 'BUG', title: 'Crash', description: 'It crashes' };

const insertReport = (
  app: TestApp,
  row: {
    readonly id: string;
    readonly userId: string;
    readonly createdAt: string;
  },
) =>
  app.db.query(
    `insert into user_feedback ("id", "user_id", "type", "title", "description", "created_at", "updated_at")
     values ($1, $2, 'BUG', $1, 'description', $3, $3)`,
    [row.id, row.userId, row.createdAt],
  );

describe('admin', () => {
  testEffect('require a session, then an admin address', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');

      expect((yield* app.fetch('/api/admin/stats')).status).toBe(401);

      const forbidden = yield* ana.device.get('/api/admin/stats');
      expect(forbidden.status).toBe(403);
      expect(forbidden.body).toEqual({
        _tag: 'Forbidden',
        error: 'No autorizado',
      });
    }),
  );

  testEffect('counts users and groups for an admin', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const admin = yield* signIn(app, ADMIN);
      yield* signIn(app, 'ana@vornway.test');

      const stats = yield* admin.device.get('/api/admin/stats');

      expect(stats.status).toBe(200);
      expect(stats.body).toEqual({ totalUsers: 2, totalGroups: 0 });
    }),
  );

  describe('feedback', () => {
    testEffect('lists the reports of every user with their author', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const admin = yield* signIn(app, ADMIN);
        const ana = yield* signIn(app, 'ana@vornway.test');
        yield* ana.device.post('/api/feedback', REPORT);

        const result = yield* admin.device.get('/api/admin/feedback');

        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({
          data: [
            {
              userId: ana.id,
              title: 'Crash',
              status: 'OPEN',
              metadata: { attachments: [] },
              user: { id: ana.id, email: 'ana@vornway.test', image: null },
            },
          ],
          pagination: { limit: 20, total: 1, nextCursor: null },
        });
      }),
    );

    testEffect(
      'pages through the reports with the cursor of the last row',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const admin = yield* signIn(app, ADMIN);
          yield* insertReport(app, {
            id: 'first',
            userId: admin.id,
            createdAt: '2026-11-01T10:00:00.000Z',
          });
          yield* insertReport(app, {
            id: 'second',
            userId: admin.id,
            createdAt: '2026-11-02T10:00:00.000Z',
          });
          yield* insertReport(app, {
            id: 'third',
            userId: admin.id,
            createdAt: '2026-11-03T10:00:00.000Z',
          });

          const firstPage = yield* admin.device.get(
            '/api/admin/feedback?limit=2',
          );
          const cursor = (firstPage.body.pagination as { nextCursor: string })
            .nextCursor;
          const secondPage = yield* admin.device.get(
            `/api/admin/feedback?limit=2&cursor=${cursor}`,
          );

          expect(firstPage.body).toMatchObject({
            data: [{ id: 'third' }, { id: 'second' }],
            pagination: { limit: 2, total: 3, nextCursor: 'second' },
          });
          expect(secondPage.body).toMatchObject({
            data: [{ id: 'first' }],
            pagination: { limit: 2, total: 3, nextCursor: null },
          });
        }),
    );

    testEffect(
      'updates the status and priority of a report, clearing the priority with null',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const admin = yield* signIn(app, ADMIN);
          const report = yield* admin.device.post('/api/feedback', {
            ...REPORT,
            priority: 'low',
          });
          const id = (report.body as { id: string }).id;

          const updated = yield* admin.device.patch(
            `/api/admin/feedback/${id}`,
            {
              status: 'DONE',
              priority: '  urgent ',
            },
          );

          expect(updated.status).toBe(200);
          expect(updated.body).toMatchObject({
            id,
            status: 'DONE',
            priority: 'urgent',
          });

          const cleared = yield* admin.device.patch(
            `/api/admin/feedback/${id}`,
            { priority: null },
          );

          expect(cleared.body).toMatchObject({
            status: 'DONE',
            priority: null,
          });
        }),
    );

    testEffect('rejects an update that changes nothing', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const admin = yield* signIn(app, ADMIN);
        const report = yield* admin.device.post('/api/feedback', REPORT);
        const id = (report.body as { id: string }).id;

        const result = yield* admin.device.patch(
          `/api/admin/feedback/${id}`,
          {},
        );

        expect(result.status).toBe(400);
        expect(result.body._tag).toBe('InvalidRequest');
      }),
    );

    testEffect('answers the legacy body when the report does not exist', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const admin = yield* signIn(app, ADMIN);

        const result = yield* admin.device.patch(
          '/api/admin/feedback/missing',
          { status: 'DONE' },
        );

        expect(result.status).toBe(404);
        expect(result.body).toEqual({
          _tag: 'AdminFeedbackNotFound',
          error: 'Reporte no encontrado',
        });
      }),
    );
  });
});
