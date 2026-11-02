import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

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

describe('feedback', () => {
  testEffect('require a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      expect((yield* app.fetch('/api/feedback')).status).toBe(401);
      expect(
        (yield* app.fetch('/api/feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(REPORT),
        })).status,
      ).toBe(401);
    }),
  );

  describe('create', () => {
    testEffect(
      'stores the report and drops the attachment keys from its metadata',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');

          const created = yield* ana.device.post('/api/feedback', {
            ...REPORT,
            priority: ' high ',
            metadata: {
              platform: 'ios',
              attachments: [{ url: 'x' }],
              imageUrls: ['y'],
            },
          });

          expect(created.status).toBe(201);
          expect(created.body).toMatchObject({
            userId: ana.id,
            type: 'BUG',
            title: 'Crash',
            description: 'It crashes',
            status: 'OPEN',
            priority: 'high',
            metadata: { platform: 'ios' },
          });
          expect(
            yield* app.db.query(
              'select metadata from user_feedback where "user_id" = $1',
              [ana.id],
            ),
          ).toEqual([{ metadata: { platform: 'ios' } }]);
        }),
    );

    testEffect('rejects a report without a title or with an unknown type', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        const blankTitle = yield* ana.device.post('/api/feedback', {
          ...REPORT,
          title: '   ',
        });
        const unknownType = yield* ana.device.post('/api/feedback', {
          ...REPORT,
          type: 'PRAISE',
        });

        expect(blankTitle.status).toBe(400);
        expect(blankTitle.body._tag).toBe('InvalidRequest');
        expect(unknownType.status).toBe(400);
      }),
    );

    testEffect(
      'answers the legacy error body when an image is not a data URL',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');

          const refused = yield* ana.device.post('/api/feedback', {
            ...REPORT,
            images: [{ dataUrl: 'not-an-image' }],
          });

          expect(refused.status).toBe(400);
          expect(refused.body).toEqual({
            _tag: 'FeedbackCreateFailed',
            code: 'FEEDBACK_CREATE_FAILED',
            message: 'No se pudo crear el reporte',
          });
        }),
    );
  });

  describe('list', () => {
    testEffect("lists only the signed-in user's reports", () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');
        yield* ana.device.post('/api/feedback', REPORT);
        yield* ana.device.post('/api/feedback', {
          ...REPORT,
          title: 'Another',
        });
        yield* bruno.device.post('/api/feedback', {
          ...REPORT,
          title: 'Theirs',
        });

        const result = yield* ana.device.get('/api/feedback');

        expect(result.status).toBe(200);
        expect(result.body).toMatchObject({
          data: [
            expect.objectContaining({ userId: ana.id }),
            expect.objectContaining({ userId: ana.id }),
          ],
          pagination: { limit: 20, total: 2, nextCursor: null },
        });
      }),
    );

    testEffect(
      'pages through the reports with the cursor of the last row',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');
          yield* insertReport(app, {
            id: 'first',
            userId: ana.id,
            createdAt: '2026-11-01T10:00:00.000Z',
          });
          yield* insertReport(app, {
            id: 'second',
            userId: ana.id,
            createdAt: '2026-11-02T10:00:00.000Z',
          });
          yield* insertReport(app, {
            id: 'third',
            userId: ana.id,
            createdAt: '2026-11-03T10:00:00.000Z',
          });

          const firstPage = yield* ana.device.get('/api/feedback?limit=2');
          const cursor = (firstPage.body.pagination as { nextCursor: string })
            .nextCursor;
          const secondPage = yield* ana.device.get(
            `/api/feedback?limit=2&cursor=${cursor}`,
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

    testEffect('rejects a page size above fifty', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        const result = yield* ana.device.get('/api/feedback?limit=51');

        expect(result.status).toBe(400);
      }),
    );
  });

  describe('delete', () => {
    testEffect('removes a report of the signed-in user', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const report = yield* ana.device.post('/api/feedback', REPORT);
        const id = (report.body as { id: string }).id;

        const removed = yield* ana.device.delete(`/api/feedback/${id}`);

        expect(removed.status).toBe(200);
        expect(removed.body).toEqual({ success: true });
        expect(yield* app.db.query('select id from user_feedback')).toEqual([]);
      }),
    );

    testEffect("answers not found for another user's report and keeps it", () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');
        const report = yield* ana.device.post('/api/feedback', REPORT);
        const id = (report.body as { id: string }).id;

        const attempt = yield* bruno.device.delete(`/api/feedback/${id}`);

        expect(attempt.status).toBe(404);
        expect(attempt.body).toEqual({
          _tag: 'FeedbackNotFound',
          code: 'FEEDBACK_NOT_FOUND',
          message: 'Reporte no encontrado',
        });
        expect(yield* app.db.query('select id from user_feedback')).toEqual([
          { id },
        ]);
      }),
    );
  });
});
