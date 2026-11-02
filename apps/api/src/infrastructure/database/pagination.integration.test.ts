import { describe, expect } from 'bun:test';
import { Cursor } from '@vornway/contracts/schema';
import { Effect, Layer } from 'effect';
import { testConfig } from '../../../testkit/config';
import { testDatabase } from '../../../testkit/database';
import { testEffect } from '../../../testkit/effect';
import { ErrorCapture } from '../http/errors';
import { Database, DatabaseClient } from './database';
import { pageArgs, toPage } from './pagination';

const TestDatabase = Database.layer.pipe(
  Layer.provide([DatabaseClient.layer, ErrorCapture.layerLog]),
);

describe('pageArgs and toPage', () => {
  testEffect('walk a Prisma list page by page without gaps or repeats', () =>
    Effect.gen(function* () {
      const db = yield* testDatabase;
      yield* db.query(
        `insert into "user" (id, name, email, "updatedAt") values ('ana', 'Ana', 'ana@vornway.test', now())`,
      );
      for (const [id, createdAt] of [
        ['n1', '2026-01-01T00:00:00Z'],
        ['n2', '2026-01-02T00:00:00Z'],
        ['n3', '2026-01-03T00:00:00Z'],
        ['n4', '2026-01-03T00:00:00Z'],
        ['n5', '2026-01-05T00:00:00Z'],
      ]) {
        yield* db.query(
          `insert into notification (id, "userId", type, title, body, url, "createdAt")
           values ($1, 'ana', 'test', 't', 'b', '/', $2)`,
          [id, createdAt],
        );
      }
      const database = yield* Database.pipe(
        Effect.provide(TestDatabase),
        Effect.provide(testConfig({ DATABASE_URL: db.url })),
      );

      const listPage = (cursor?: string) => {
        const { limit, args } = pageArgs({
          limit: 2,
          ...(cursor && { cursor: Cursor.make(cursor) }),
        });
        return Effect.all([
          database.use((client) =>
            client.notification.findMany({ where: { userId: 'ana' }, ...args }),
          ),
          database.use((client) =>
            client.notification.count({ where: { userId: 'ana' } }),
          ),
        ]).pipe(Effect.map(([rows, total]) => toPage(rows, limit, total)));
      };

      const first = yield* listPage();
      const second = yield* listPage(first.pagination.nextCursor ?? undefined);
      const third = yield* listPage(second.pagination.nextCursor ?? undefined);

      expect(first.data.map((row) => row.id)).toEqual(['n5', 'n4']);
      expect(second.data.map((row) => row.id)).toEqual(['n3', 'n2']);
      expect(third.data.map((row) => row.id)).toEqual(['n1']);
      expect(first.pagination).toEqual({
        limit: 2,
        total: 5,
        nextCursor: 'n4',
      });
      expect(third.pagination.nextCursor).toBeNull();
    }),
  );
});
