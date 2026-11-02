import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import {
  addMember,
  createExpense,
  createGroup,
  eventually,
  memberIdOf,
  trip,
  waitFor,
} from './test-support';

const DENIED = {
  _tag: 'GroupAccessDenied',
  error: 'No tienes acceso a este grupo',
};

describe('group members', () => {
  describe('add', () => {
    testEffect('adds a participant without an account', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const { id } = yield* createGroup(ana.device);

        const response = yield* ana.device.post(`/api/groups/${id}/members`, {
          name: 'Carla',
        });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          id: expect.any(String),
          name: 'Carla',
        });
        expect(
          yield* app.db.query(
            'select name, "userId", role from group_member where id = $1',
            [response.body.id],
          ),
        ).toEqual([{ name: 'Carla', userId: null, role: 'member' }]);
      }),
    );

    testEffect('links an account and tells that user about it', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const bruno = yield* signIn(app, 'bruno@vornway.test');
        const { id } = yield* createGroup(ana.device);

        const member = yield* addMember(ana.device, id, 'Bruno', bruno.id);
        const sent = yield* waitFor(() => app.push.sent[0]);
        const inbox = yield* eventually(
          app.db
            .query('select "userId", type, url from notification')
            .pipe(Effect.map((rows) => (rows.length > 0 ? rows : undefined))),
        );

        expect(sent?.userIds).toEqual([bruno.id]);
        expect(sent?.payload).toMatchObject({
          title: 'Te agregaron a Viaje',
          url: `/groups/${id}`,
          type: 'group.member.added',
          groupId: id,
        });
        expect(inbox).toEqual([
          {
            userId: bruno.id,
            type: 'group.member.added',
            url: `/groups/${id}`,
          },
        ]);
        expect(member).toEqual(yield* memberIdOf(app, id, bruno.id));
      }),
    );

    testEffect('returns the member that already has that account', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, bruno, group, brunoMember } = yield* trip(app);

        const again = yield* ana.device.post(`/api/groups/${group}/members`, {
          name: 'Otro nombre',
          linkedUserId: bruno.id,
        });

        expect(again.status).toBe(201);
        expect(again.body).toEqual({ id: brunoMember, name: 'Bruno' });
        expect(
          yield* app.db.query(
            'select id from group_member where "groupId" = $1',
            [group],
          ),
        ).toHaveLength(2);
      }),
    );

    testEffect('is refused to someone outside the group', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { group } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');

        const response = yield* carla.device.post(
          `/api/groups/${group}/members`,
          {
            name: 'Intruso',
          },
        );

        expect([response.status, response.body]).toEqual([400, DENIED]);
        expect(
          yield* app.db.query(
            'select id from group_member where "groupId" = $1',
            [group],
          ),
        ).toHaveLength(2);
      }),
    );

    testEffect('rejects an empty name', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group } = yield* trip(app);

        const response = yield* ana.device.post(
          `/api/groups/${group}/members`,
          {
            name: '',
          },
        );

        expect([response.status, response.body._tag]).toEqual([
          400,
          'InvalidRequest',
        ]);
      }),
    );
  });

  describe('search', () => {
    testEffect('finds accounts and flags who is already in the group', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group } = yield* trip(app);
        yield* signIn(app, 'carla@vornway.test');

        const response = yield* ana.device.get(
          `/api/groups/${group}/members/search?query=vornway.test`,
        );

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          data: [
            expect.objectContaining({
              email: 'ana@vornway.test',
              isCurrentUser: true,
              isAlreadyMember: true,
            }),
            expect.objectContaining({
              email: 'bruno@vornway.test',
              isCurrentUser: false,
              isAlreadyMember: true,
            }),
            expect.objectContaining({
              email: 'carla@vornway.test',
              isCurrentUser: false,
              isAlreadyMember: false,
            }),
          ],
        });
      }),
    );

    testEffect('is closed to people outside the group', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { group } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');

        const response = yield* carla.device.get(
          `/api/groups/${group}/members/search?query=ana`,
        );
        const empty = yield* carla.device.get(
          `/api/groups/${group}/members/search?query=%20`,
        );

        expect([response.status, response.body]).toEqual([400, DENIED]);
        expect([empty.status, empty.body._tag]).toEqual([
          400,
          'InvalidRequest',
        ]);
      }),
    );
  });

  describe('remove', () => {
    testEffect('lets the owner remove a participant with no expenses', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group } = yield* trip(app);
        const carla = yield* addMember(ana.device, group, 'Carla');

        const response = yield* ana.device.delete(
          `/api/groups/${group}/members/${carla}`,
        );

        expect(response.body).toEqual({ id: carla, name: 'Carla' });
        expect(
          yield* app.db.query('select id from group_member where id = $1', [
            carla,
          ]),
        ).toEqual([]);
        expect(
          yield* app.db.query(
            'select action from activity_log where "groupId" = $1 order by "createdAt"',
            [group],
          ),
        ).toContainEqual({ action: 'group.member_removed' });
      }),
    );

    testEffect('explains why a participant cannot be removed', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, bruno, group, anaMember, brunoMember } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');
        const busy = yield* addMember(ana.device, group, 'Con gastos');
        yield* createExpense(ana.device, group, {
          paidById: anaMember,
          participantIds: [anaMember, busy],
        });
        const remove = (device: typeof ana.device, member: string) =>
          device.delete(`/api/groups/${group}/members/${member}`);

        const results = [
          yield* remove(bruno.device, anaMember),
          yield* remove(carla.device, brunoMember),
          yield* remove(ana.device, anaMember),
          yield* remove(ana.device, busy),
          yield* remove(ana.device, 'unknown'),
        ].map((response) => [response.status, response.body]);

        expect(results).toEqual([
          [
            400,
            {
              _tag: 'GroupMemberRemoveForbidden',
              error: 'Solo el creador puede eliminar participantes',
            },
          ],
          [400, DENIED],
          [
            400,
            {
              _tag: 'GroupOwnerRemoveForbidden',
              error: 'No puedes eliminar al creador del grupo',
            },
          ],
          [
            400,
            {
              _tag: 'GroupMemberHasExpenses',
              error: 'El participante ya tiene gastos',
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

  describe('unlink account', () => {
    testEffect('lets the owner detach a participant from their account', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, brunoMember } = yield* trip(app);

        const response = yield* ana.device.delete(
          `/api/groups/${group}/members/${brunoMember}/account-link`,
        );
        const again = yield* ana.device.delete(
          `/api/groups/${group}/members/${brunoMember}/account-link`,
        );

        expect(response.body).toEqual({ id: brunoMember, name: 'Bruno' });
        expect(
          yield* app.db.query(
            'select "userId" from group_member where id = $1',
            [brunoMember],
          ),
        ).toEqual([{ userId: null }]);
        expect([again.status, again.body]).toEqual([
          400,
          {
            _tag: 'GroupMemberAlreadyUnlinked',
            error: 'El participante ya no tiene una cuenta vinculada',
          },
        ]);
      }),
    );

    testEffect(
      'removes a member who leaves with no expenses, and keeps one who has them',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, bruno, group, anaMember, brunoMember } =
            yield* trip(app);
          const carla = yield* signIn(app, 'carla@vornway.test');
          const carlaMember = yield* addMember(
            ana.device,
            group,
            'Carla',
            carla.id,
          );
          yield* createExpense(ana.device, group, {
            paidById: anaMember,
            participantIds: [anaMember, brunoMember],
          });

          const leavesClean = yield* carla.device.delete(
            `/api/groups/${group}/members/${carlaMember}/account-link`,
          );
          const leavesBusy = yield* bruno.device.delete(
            `/api/groups/${group}/members/${brunoMember}/account-link`,
          );

          expect(leavesClean.status).toBe(200);
          expect(leavesBusy.status).toBe(200);
          expect(
            yield* app.db.query('select id from group_member where id = $1', [
              carlaMember,
            ]),
          ).toEqual([]);
          expect(
            yield* app.db.query(
              'select "userId" from group_member where id = $1',
              [brunoMember],
            ),
          ).toEqual([{ userId: null }]);
        }),
    );

    testEffect('refuses to detach someone else unless you own the group', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { bruno, group, anaMember } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');

        const byMember = yield* bruno.device.delete(
          `/api/groups/${group}/members/${anaMember}/account-link`,
        );
        const byOutsider = yield* carla.device.delete(
          `/api/groups/${group}/members/${anaMember}/account-link`,
        );

        expect([byMember.status, byMember.body._tag]).toEqual([
          400,
          'GroupMemberUnlinkForbidden',
        ]);
        expect([byOutsider.status, byOutsider.body]).toEqual([400, DENIED]);
      }),
    );
  });
});
