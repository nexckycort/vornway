import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

const insertNotification = (
  app: TestApp,
  row: {
    readonly id: string;
    readonly userId: string;
    readonly createdAt: string;
    readonly readAt?: string;
  },
) =>
  app.db.query(
    `insert into notification ("id", "userId", "type", "title", "body", "url", "createdAt", "readAt")
     values ($1, $2, 'expense.created', $1, 'body', '/groups/g1', $3, $4)`,
    [row.id, row.userId, row.createdAt, row.readAt ?? null],
  );

describe('notifications', () => {
  testEffect('require a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();

      expect((yield* app.fetch('/api/notifications')).status).toBe(401);
      expect(
        (yield* app.fetch('/api/notifications/read-all', { method: 'POST' }))
          .status,
      ).toBe(401);
    }),
  );

  describe('list', () => {
    testEffect(
      "lists the signed-in user's notifications, newest first, with the unread count",
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');
          const bruno = yield* signIn(app, 'bruno@vornway.test');
          yield* insertNotification(app, {
            id: 'older',
            userId: ana.id,
            createdAt: '2026-11-01T10:00:00.000Z',
          });
          yield* insertNotification(app, {
            id: 'newer',
            userId: ana.id,
            createdAt: '2026-11-02T10:00:00.000Z',
            readAt: '2026-11-02T11:00:00.000Z',
          });
          yield* insertNotification(app, {
            id: 'theirs',
            userId: bruno.id,
            createdAt: '2026-11-03T10:00:00.000Z',
          });

          const result = yield* ana.device.get('/api/notifications');

          expect(result.status).toBe(200);
          expect(result.body).toEqual({
            data: [
              {
                id: 'newer',
                type: 'expense.created',
                title: 'newer',
                body: 'body',
                url: '/groups/g1',
                groupId: null,
                expenseId: null,
                actorName: null,
                actorImage: null,
                readAt: '2026-11-02T11:00:00.000Z',
                createdAt: '2026-11-02T10:00:00.000Z',
              },
              expect.objectContaining({ id: 'older', readAt: null }),
            ],
            pagination: { limit: 20, total: 2, nextCursor: null },
            unreadCount: 1,
          });
        }),
    );

    testEffect('pages through the list with the cursor of the last row', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        yield* insertNotification(app, {
          id: 'first',
          userId: ana.id,
          createdAt: '2026-11-01T10:00:00.000Z',
        });
        yield* insertNotification(app, {
          id: 'second',
          userId: ana.id,
          createdAt: '2026-11-02T10:00:00.000Z',
        });
        yield* insertNotification(app, {
          id: 'third',
          userId: ana.id,
          createdAt: '2026-11-03T10:00:00.000Z',
        });

        const firstPage = yield* ana.device.get('/api/notifications?limit=2');
        const cursor = (firstPage.body.pagination as { nextCursor: string })
          .nextCursor;
        const secondPage = yield* ana.device.get(
          `/api/notifications?limit=2&cursor=${cursor}`,
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

        const result = yield* ana.device.get('/api/notifications?limit=51');

        expect(result.status).toBe(400);
        expect(result.body._tag).toBe('InvalidRequest');
      }),
    );
  });

  testEffect("marks only the signed-in user's notifications as read", () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const ana = yield* signIn(app, 'ana@vornway.test');
      const bruno = yield* signIn(app, 'bruno@vornway.test');
      yield* insertNotification(app, {
        id: 'ana-1',
        userId: ana.id,
        createdAt: '2026-11-01T10:00:00.000Z',
      });
      yield* insertNotification(app, {
        id: 'bruno-1',
        userId: bruno.id,
        createdAt: '2026-11-01T10:00:00.000Z',
      });

      const result = yield* ana.device.post('/api/notifications/read-all');

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ success: true });
      expect(
        yield* app.db.query(
          'select id, "readAt" is not null as read from notification order by id',
        ),
      ).toEqual([
        { id: 'ana-1', read: true },
        { id: 'bruno-1', read: false },
      ]);
      expect(
        (yield* ana.device.get('/api/notifications')).body.unreadCount,
      ).toBe(0);
      expect(
        (yield* bruno.device.get('/api/notifications')).body.unreadCount,
      ).toBe(1);
    }),
  );
});
