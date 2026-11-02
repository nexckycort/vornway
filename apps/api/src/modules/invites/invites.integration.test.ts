import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';

describe('invites', () => {
  testEffect('requires authentication and reports missing groups', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      expect((yield* app.fetch('/api/invites/missing')).status).toBe(401);
      const user = yield* signIn(app, 'invites@vornway.test');
      const missing = yield* user.device.get('/api/invites/missing');
      expect(missing.status).toBe(404);
      expect(missing.body).toEqual({
        _tag: 'InviteGroupNotFound',
        error: 'Grupo no encontrado',
      });
    }),
  );
  testEffect(
    'previews and accepts an invite, including an existing membership',
    () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const owner = yield* signIn(app, 'owner@vornway.test');
        const guest = yield* signIn(app, 'guest@vornway.test');
        yield* app.db.query(
          'insert into "group" (id, name, type, "createdAt", "updatedAt", "ownerId", "inviteCode") values ($1, $2, $3, now(), now(), $4, $5)',
          ['g1', 'Trip', 'trip', owner.id, 'invite'],
        );
        yield* app.db.query(
          'insert into group_member (id, "groupId", name) values ($1, $2, $3)',
          ['m1', 'g1', 'Guest'],
        );
        const preview = yield* guest.device.get('/api/invites/invite');
        expect(preview.status).toBe(200);
        expect(preview.body.unregisteredMembers).toEqual([
          { id: 'm1', name: 'Guest' },
        ]);
        const missing = yield* guest.device.post('/api/invites/invite/accept', {
          memberId: 'missing',
        });
        expect(missing.status).toBe(400);
        expect(missing.body).toEqual({
          _tag: 'InviteMemberNotFound',
          error: 'Miembro no encontrado',
        });
        const accepted = yield* guest.device.post(
          '/api/invites/invite/accept',
          { memberId: 'm1' },
        );
        expect(accepted.status).toBe(201);
        expect(accepted.body).toEqual({
          groupId: 'g1',
          groupType: 'trip',
          memberId: 'm1',
        });
        expect(
          (yield* guest.device.post('/api/invites/invite/accept', {})).body,
        ).toEqual(accepted.body);
        const other = yield* signIn(app, 'other@vornway.test');
        const linked = yield* other.device.post('/api/invites/invite/accept', {
          memberId: 'm1',
        });
        expect(linked.status).toBe(400);
        expect(linked.body).toEqual({
          _tag: 'InviteMemberAlreadyLinked',
          error: 'Ese participante ya tiene una cuenta asociada',
        });
        expect(
          (yield* other.device.post('/api/invites/invite/accept', {
            memberId: '',
          })).status,
        ).toBe(400);
      }),
  );
});
