import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { DATA_URL, expense, trip } from './test-support';

const attachedExpense = (paidById: string) =>
  expense({ paidById, attachmentImage: { dataUrl: DATA_URL } });

describe('expense attachments', () => {
  testEffect('stores the uploaded image on the created expense', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group, anaMember } = yield* trip(app);

      const created = yield* ana.device.post(
        `/api/groups/${group}/expenses`,
        attachedExpense(anaMember),
      );
      const key = `groups/${group}/expenses/${created.body.id}/attachment.webp`;
      const detail = yield* ana.device.get(
        `/api/groups/${group}/expenses/${created.body.id}`,
      );

      expect(created.status).toBe(201);
      expect(app.storage.uploads).toEqual([{ key, dataUrl: DATA_URL }]);
      expect(yield* app.db.query('select attachment from expense')).toEqual([
        { attachment: `/${key}` },
      ]);
      expect(detail.body.attachmentUrl).toBe(
        `https://assets.vornway.com/${key}`,
      );
    }),
  );

  testEffect(
    'overwrites the same object when an update sends a new image',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const created = yield* ana.device.post(
          `/api/groups/${group}/expenses`,
          attachedExpense(anaMember),
        );

        const updated = yield* ana.device.put(
          `/api/groups/${group}/expenses/${created.body.id}`,
          attachedExpense(anaMember),
        );

        expect(updated.status).toBe(200);
        expect(app.storage.uploads.map((upload) => upload.key)).toEqual([
          `groups/${group}/expenses/${created.body.id}/attachment.webp`,
          `groups/${group}/expenses/${created.body.id}/attachment.webp`,
        ]);
        expect(app.storage.deleted).toEqual([]);
      }),
  );

  testEffect(
    'keeps the previous attachment when an update sends no image',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const created = yield* ana.device.post(
          `/api/groups/${group}/expenses`,
          attachedExpense(anaMember),
        );

        yield* ana.device.put(
          `/api/groups/${group}/expenses/${created.body.id}`,
          expense({ paidById: anaMember, description: 'Almuerzo' }),
        );

        expect(app.storage.deleted).toEqual([]);
        expect(
          yield* app.db.query('select description, attachment from expense'),
        ).toEqual([
          {
            description: 'Almuerzo',
            attachment: `/groups/${group}/expenses/${created.body.id}/attachment.webp`,
          },
        ]);
      }),
  );

  testEffect('deletes the stored image when the expense is deleted', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group, anaMember } = yield* trip(app);
      const created = yield* ana.device.post(
        `/api/groups/${group}/expenses`,
        attachedExpense(anaMember),
      );

      const removed = yield* ana.device.delete(
        `/api/groups/${group}/expenses/${created.body.id}`,
      );

      expect(removed.status).toBe(200);
      expect(app.storage.deleted).toEqual([
        `/groups/${group}/expenses/${created.body.id}/attachment.webp`,
      ]);
    }),
  );
});
