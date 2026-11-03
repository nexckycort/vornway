import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { randomId } from '../../../testkit/id';
import { stringifyJson } from '../../../testkit/json';
import { signIn } from '../../../testkit/login';
import {
  addMember,
  createExpense,
  createGroup,
  DATA_URL,
  sessionCookie,
  trip,
} from './test-support';

const NOT_FOUND = { _tag: 'GroupNotFound', error: 'Grupo no encontrado' };

describe('groups', () => {
  testEffect('require a session', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const post = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: stringifyJson({ name: 'Viaje', type: 'trip' }),
      };

      const responses = yield* Effect.all([
        app.fetch('/api/groups'),
        app.fetch('/api/groups', post),
        app.fetch('/api/groups/any'),
        app.fetch('/api/groups/any/export'),
        app.fetch('/api/groups/any/expenses'),
        app.fetch('/api/groups/any/reports/totals'),
        app.fetch('/api/groups/any/members/search?query=a'),
        app.fetch('/api/groups/any', { method: 'DELETE' }),
      ]);

      expect(responses.map((response) => response.status)).toEqual([
        401, 401, 401, 401, 401, 401, 401, 401,
      ]);
    }),
  );

  describe('create', () => {
    testEffect('makes the caller the admin owner and logs the activity', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        const response = yield* ana.device.post('/api/groups', {
          name: '  Viaje  ',
          type: 'trip',
          description: '  Costa  ',
        });
        const id = String(response.body.id);

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          id,
          name: 'Viaje',
          type: 'trip',
          description: 'Costa',
          imageUrl: null,
          inviteCode: expect.stringMatching(/^[0-9a-f]{8}$/),
          createdAt: expect.any(String),
        });
        expect(
          yield* app.db.query(
            'select "ownerId", name, type from "group" where id = $1',
            [id],
          ),
        ).toEqual([{ ownerId: ana.id, name: 'Viaje', type: 'trip' }]);
        expect(
          yield* app.db.query(
            'select "userId", role from group_member where "groupId" = $1',
            [id],
          ),
        ).toEqual([{ userId: ana.id, role: 'admin' }]);
        expect(
          yield* app.db.query(
            'select action from activity_log where "groupId" = $1',
            [id],
          ),
        ).toEqual([{ action: 'group.created' }]);
      }),
    );

    testEffect(
      'keeps a client generated id and skips duplicate participants',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');
          const bruno = yield* signIn(app, 'bruno@vornway.test');
          const id = yield* randomId;

          const response = yield* ana.device.post('/api/groups', {
            id,
            name: 'Viaje',
            type: 'trip',
            participants: [
              { name: 'Bruno', userId: bruno.id },
              { name: 'Bruno otra vez', userId: bruno.id },
              { name: 'Ana', userId: ana.id },
              { name: 'Carla' },
              { name: 'carla' },
              { name: '   ' },
            ],
          });

          expect(response.body.id).toBe(id);
          expect(
            yield* app.db.query(
              'select name, role from group_member where "groupId" = $1 order by role, name',
              [id],
            ),
          ).toEqual([
            { name: 'ana@vornway.test', role: 'admin' },
            { name: 'Bruno', role: 'member' },
            { name: 'Carla', role: 'member' },
          ]);
        }),
    );

    testEffect(
      'stores the cover image, and creates the group without it when the upload fails',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');

          const withImage = yield* createGroup(ana.device, {
            image: { dataUrl: DATA_URL },
          });
          const rejected = yield* createGroup(ana.device, {
            image: { dataUrl: 'not-a-data-url' },
          });

          expect(withImage.imageUrl).toMatch(
            new RegExp(
              `^https://assets\\.vornway\\.com/groups/${withImage.id}/cover\\.webp\\?v=\\d+$`,
            ),
          );
          expect(app.storage.uploads).toEqual([
            { key: `groups/${withImage.id}/cover.webp`, dataUrl: DATA_URL },
          ]);
          expect(rejected.imageUrl).toBeNull();
        }),
    );

    testEffect('rejects invalid payloads', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');

        for (const body of [
          { name: '', type: 'trip' },
          { name: 'Viaje' },
          { name: 'Viaje', type: 'trip', id: 'not-a-uuid' },
          { name: 'x'.repeat(121), type: 'trip' },
        ]) {
          const response = yield* ana.device.post('/api/groups', body);
          expect(response.status).toBe(400);
          expect(response.body._tag).toBe('InvalidRequest');
        }
      }),
    );
  });

  describe('update', () => {
    testEffect('edits the group and replaces its image', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const { id } = yield* createGroup(ana.device);
        yield* app.db.query(
          'update "group" set "imageUrl" = $1 where id = $2',
          ['/groups/old/cover.webp', id],
        );

        const updated = yield* ana.device.patch(`/api/groups/${id}`, {
          name: ' Nuevo ',
          type: 'friends',
          description: '',
          image: { dataUrl: DATA_URL },
        });

        expect(updated.status).toBe(200);
        expect(updated.body).toMatchObject({
          id,
          name: 'Nuevo',
          type: 'friends',
          description: null,
        });
        expect(updated.body.imageUrl).toContain(`/groups/${id}/cover.webp?v=`);
        expect(app.storage.deleted).toEqual(['/groups/old/cover.webp']);
      }),
    );

    testEffect(
      'answers 500 when the new image is refused, keeping the group as it was',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');
          const { id } = yield* createGroup(ana.device);

          const response = yield* ana.device.patch(`/api/groups/${id}`, {
            name: 'Nuevo',
            type: 'trip',
            image: { dataUrl: 'not-a-data-url' },
          });

          expect(response.status).toBe(500);
          expect(response.body._tag).toBe('InternalError');
          expect(
            yield* app.db.query('select name from "group" where id = $1', [id]),
          ).toEqual([{ name: 'Viaje' }]);
        }),
    );

    testEffect('toggles the advanced expense details setting', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const { id } = yield* createGroup(ana.device);

        const enabled = yield* ana.device.patch(`/api/groups/${id}/settings`, {
          advancedExpenseDetailsEnabled: true,
        });
        const untouched = yield* ana.device.patch(
          `/api/groups/${id}/settings`,
          {},
        );

        expect(enabled.body).toEqual({
          id,
          advancedExpenseDetailsEnabled: true,
          updatedAt: expect.any(String),
        });
        expect(untouched.body.advancedExpenseDetailsEnabled).toBe(true);
      }),
    );

    testEffect('changes the image only', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const { id } = yield* createGroup(ana.device);

        const response = yield* ana.device.patch(`/api/groups/${id}/image`, {
          dataUrl: DATA_URL,
        });

        expect(response.status).toBe(200);
        expect(response.body.imageUrl).toContain(`/groups/${id}/cover.webp?v=`);
        expect(
          yield* app.db.query(
            'select name, "imageUrl" from "group" where id = $1',
            [id],
          ),
        ).toEqual([{ name: 'Viaje', imageUrl: `/groups/${id}/cover.webp` }]);
      }),
    );

    testEffect("can't be changed by someone outside the group", () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const carla = yield* signIn(app, 'carla@vornway.test');
        const { id } = yield* createGroup(ana.device);

        const responses = yield* Effect.all([
          carla.device.patch(`/api/groups/${id}`, { name: 'X', type: 'trip' }),
          carla.device.patch(`/api/groups/${id}/settings`, {}),
          carla.device.patch(`/api/groups/${id}/image`, { dataUrl: DATA_URL }),
        ]);

        expect(responses.map((response) => response.status)).toEqual([
          404, 404, 404,
        ]);
        expect(
          yield* app.db.query('select name from "group" where id = $1', [id]),
        ).toEqual([{ name: 'Viaje' }]);
      }),
    );
  });

  describe('delete', () => {
    testEffect(
      'lets only the owner delete the group with everything in it',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, bruno, group, anaMember } = yield* trip(app);
          yield* createExpense(ana.device, group, {
            paidById: anaMember,
            participantIds: [anaMember],
          });

          const byMember = yield* bruno.device.delete(`/api/groups/${group}`);
          const byOwner = yield* ana.device.delete(`/api/groups/${group}`);

          expect([byMember.status, byMember.body]).toEqual([404, NOT_FOUND]);
          expect(byOwner.body).toEqual({ id: group });
          expect(yield* app.db.query('select id from "group"')).toEqual([]);
          expect(yield* app.db.query('select id from expense')).toEqual([]);
          expect(yield* app.db.query('select id from group_member')).toEqual(
            [],
          );
        }),
    );
  });

  describe('transfer owner', () => {
    testEffect('hands the group to a linked member and swaps the roles', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, bruno, group, anaMember, brunoMember } = yield* trip(app);

        const response = yield* ana.device.patch(`/api/groups/${group}/owner`, {
          memberId: brunoMember,
        });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          id: group,
          ownerId: bruno.id,
          ownerMemberId: brunoMember,
          ownerName: 'Bruno',
          updatedAt: expect.any(String),
        });
        expect(
          yield* app.db.query(
            'select id, role from group_member where "groupId" = $1 order by role',
            [group],
          ),
        ).toEqual([
          { id: brunoMember, role: 'admin' },
          { id: anaMember, role: 'member' },
        ]);
      }),
    );

    testEffect('explains why a transfer is refused', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, bruno, group, anaMember, brunoMember } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');
        const unlinked = yield* addMember(ana.device, group, 'Sin cuenta');
        const path = `/api/groups/${group}/owner`;

        const notOwner = yield* bruno.device.patch(path, {
          memberId: anaMember,
        });
        const outsider = yield* carla.device.patch(path, {
          memberId: brunoMember,
        });
        const needsAccount = yield* ana.device.patch(path, {
          memberId: unlinked,
        });
        const same = yield* ana.device.patch(path, { memberId: anaMember });
        const unknown = yield* ana.device.patch(path, { memberId: 'unknown' });

        expect(
          [notOwner, outsider, needsAccount, same, unknown].map((r) => [
            r.status,
            r.body,
          ]),
        ).toEqual([
          [
            403,
            {
              _tag: 'GroupOwnerTransferForbidden',
              error: 'Solo el dueño puede transferir el grupo',
            },
          ],
          [
            400,
            {
              _tag: 'GroupAccessDenied',
              error: 'No tienes acceso a este grupo',
            },
          ],
          [
            400,
            {
              _tag: 'GroupOwnerTransferTargetRequired',
              error: 'El nuevo dueño debe tener una cuenta vinculada',
            },
          ],
          [
            400,
            {
              _tag: 'GroupOwnerTransferTargetSame',
              error: 'Ese participante ya es el dueño del grupo',
            },
          ],
          [
            400,
            {
              _tag: 'GroupMemberNotFound',
              error: 'Participante no encontrado',
            },
          ],
        ]);
      }),
    );
  });

  describe('export', () => {
    testEffect('downloads the group as a csv attachment', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember, brunoMember } = yield* trip(app);
        yield* createExpense(ana.device, group, {
          description: 'Cena "especial"',
          paidById: anaMember,
          participantIds: [anaMember, brunoMember],
        });
        const cookie = yield* sessionCookie(app, ana.email);

        const response = yield* app.fetch(`/api/groups/${group}/export`, {
          headers: { cookie, 'expo-origin': 'vornway://' },
        });
        const text = yield* Effect.promise(() => response.text());
        const [header = '', row = ''] = text.slice(1).split('\n');

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe(
          'text/csv; charset=utf-8',
        );
        expect(response.headers.get('content-disposition')).toBe(
          'attachment; filename="viaje-export.csv"',
        );
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(text.startsWith('﻿"group_id"')).toBe(true);
        expect(header.split(',')).toHaveLength(42);
        expect(row).toContain('"Cena ""especial"""');
        expect(row).toContain('ana@vornway.test: 50 | Bruno: 50');
      }),
    );

    testEffect("does not export someone else's group", () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { group } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');

        const response = yield* carla.device.get(`/api/groups/${group}/export`);

        expect([response.status, response.body]).toEqual([404, NOT_FOUND]);
      }),
    );
  });
});
