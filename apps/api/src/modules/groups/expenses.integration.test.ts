import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import {
  bodyOf,
  createGroup,
  DATA_URL,
  expense,
  memberIdOf,
  trip,
  waitFor,
} from './test-support';

const DENIED = {
  _tag: 'GroupAccessDenied',
  error: 'No tienes acceso a este grupo',
};
type Detail = {
  splitMethod: string;
  isDeleted: boolean;
  paidByMembers: { memberId: string; name: string; amount: number }[];
  participants: { memberId: string; name: string; share: number }[];
  lineItems: { memberId: string; description: string; amount: number }[];
  sharedSplit: unknown;
  advancedDetails: Record<string, unknown> | null;
  tags: string[];
};

describe('group expenses', () => {
  describe('create', () => {
    testEffect(
      'splits equally, keeps the group totals and logs the activity',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember, brunoMember } = yield* trip(app);

          const created = yield* ana.device.post(
            `/api/groups/${group}/expenses`,
            expense({
              paidById: anaMember,
              participantIds: [anaMember, brunoMember],
            }),
          );
          const detail = yield* ana.device.get(
            `/api/groups/${group}/expenses/${created.body.id}`,
          );

          expect(created.status).toBe(201);
          expect(created.body).toEqual({ id: expect.any(String) });
          expect(bodyOf<Detail>(detail)).toMatchObject({
            splitMethod: 'equal',
            isDeleted: false,
            paidByMembers: [{ memberId: anaMember, amount: 100 }],
            participants: [
              { memberId: anaMember, share: 50 },
              { memberId: brunoMember, share: 50 },
            ],
            lineItems: [],
            sharedSplit: null,
            advancedDetails: null,
            tags: [],
          });
          expect(
            yield* app.db.query('select totals from "group" where id = $1', [
              group,
            ]),
          ).toEqual([{ totals: { COP: 100 } }]);
          expect(
            yield* app.db.query(
              `select action from activity_log where "groupId" = $1 and action like 'expense.%'`,
              [group],
            ),
          ).toEqual([{ action: 'expense.created' }]);
        }),
    );

    testEffect('supports percentage and exact splits and several payers', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember, brunoMember } = yield* trip(app);
        const path = `/api/groups/${group}/expenses`;

        const percentage = yield* ana.device.post(
          path,
          expense({
            paidById: anaMember,
            participantIds: [anaMember, brunoMember],
            splitMethod: 'percentage',
            exactShares: { [anaMember]: 25, [brunoMember]: 75 },
          }),
        );
        const exact = yield* ana.device.post(
          path,
          expense({
            paidByIds: [anaMember, brunoMember],
            payers: [
              { memberId: anaMember, amount: 30 },
              { memberId: brunoMember, amount: 70 },
            ],
            participantIds: [anaMember, brunoMember],
            splitMethod: 'exact',
            exactShares: { [anaMember]: 10, [brunoMember]: 90 },
          }),
        );
        const percentageDetail = yield* ana.device.get(
          `${path}/${percentage.body.id}`,
        );
        const exactDetail = yield* ana.device.get(`${path}/${exact.body.id}`);

        expect(
          [percentageDetail, exactDetail].map(
            (detail) => bodyOf<Detail>(detail).participants,
          ),
        ).toEqual([
          [
            { memberId: anaMember, name: expect.any(String), share: 25 },
            { memberId: brunoMember, name: 'Bruno', share: 75 },
          ],
          [
            { memberId: anaMember, name: expect.any(String), share: 10 },
            { memberId: brunoMember, name: 'Bruno', share: 90 },
          ],
        ]);
        expect(bodyOf<Detail>(exactDetail).paidByMembers).toEqual([
          { memberId: anaMember, name: expect.any(String), amount: 30 },
          { memberId: brunoMember, name: 'Bruno', amount: 70 },
        ]);
      }),
    );

    testEffect(
      'keeps line items, shared split, advanced details and tags',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember, brunoMember } = yield* trip(app);
          yield* app.db.query(
            `update "group" set type = 'personal' where id = $1`,
            [group],
          );

          const created = yield* ana.device.post(
            `/api/groups/${group}/expenses`,
            expense({
              paidById: anaMember,
              participantIds: [anaMember, brunoMember],
              splitMethod: 'exact',
              exactShares: { [anaMember]: 40, [brunoMember]: 60 },
              lineItems: [
                { memberId: anaMember, description: ' Pizza ', amount: 40 },
                { memberId: brunoMember, description: 'Vino', amount: 25 },
                { memberId: brunoMember, description: 'Postre', amount: 35 },
              ],
              sharedSplit: {
                amount: 100,
                splitMethod: 'exact',
                splitValues: { [anaMember]: 40, [brunoMember]: 60 },
                items: [{ name: ' Entrada ', amount: 100 }],
              },
              tags: ['#Viaje Largo', 'viaje-largo', 'x!y'],
              advancedDetails: {
                type: 'food',
                placeName: ' Casa ',
                email: 'casa@example.com',
                notes: '   ',
              },
            }),
          );
          const detail = yield* ana.device.get(
            `/api/groups/${group}/expenses/${created.body.id}`,
          );

          expect(bodyOf<Detail>(detail)).toMatchObject({
            lineItems: [
              { memberId: anaMember, description: 'Pizza', amount: 40 },
              { memberId: brunoMember, description: 'Vino', amount: 25 },
              { memberId: brunoMember, description: 'Postre', amount: 35 },
            ],
            sharedSplit: {
              amount: 100,
              splitMethod: 'exact',
              splitValues: { [anaMember]: 40, [brunoMember]: 60 },
              items: [{ name: 'Entrada', amount: 100 }],
            },
            tags: ['viaje-largo', 'xy'],
            advancedDetails: {
              type: 'food',
              placeName: 'Casa',
              email: 'casa@example.com',
            },
          });
          expect(bodyOf<Detail>(detail).advancedDetails).not.toHaveProperty(
            'notes',
          );
        }),
    );

    testEffect(
      'answers the same expense when a client retries with its id',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember } = yield* trip(app);
          const other = (yield* createGroup(ana.device, { name: 'Otro' })).id;
          const path = `/api/groups/${group}/expenses`;
          const body = expense({ id: 'client-expense-1', paidById: anaMember });

          const first = yield* ana.device.post(path, body);
          const retry = yield* ana.device.post(path, body);
          const conflict = yield* ana.device.post(
            `/api/groups/${other}/expenses`,
            {
              ...body,
              paidById: yield* memberIdOf(app, other, ana.id),
            },
          );

          expect([first.status, first.body]).toEqual([
            201,
            { id: 'client-expense-1' },
          ]);
          expect([retry.status, retry.body]).toEqual([
            201,
            { id: 'client-expense-1' },
          ]);
          expect([conflict.status, conflict.body]).toEqual([
            400,
            {
              _tag: 'GroupExpenseIdConflict',
              error: 'El identificador del gasto ya existe',
            },
          ]);
          expect(yield* app.db.query('select id from expense')).toHaveLength(1);
        }),
    );

    testEffect('explains why an expense is refused', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember, brunoMember } = yield* trip(app);
        const carla = yield* signIn(app, 'carla@vornway.test');
        const foreign = (yield* createGroup(carla.device)).id;
        const foreignCategory = (yield* carla.device.post(
          `/api/groups/${foreign}/categories`,
          { name: 'Ajena' },
        )).body.id;
        const path = `/api/groups/${group}/expenses`;

        const results = [
          yield* ana.device.post(path, expense({ paidById: 'unknown' })),
          yield* ana.device.post(
            path,
            expense({ paidById: anaMember, categoryId: foreignCategory }),
          ),
          yield* ana.device.post(
            path,
            expense({
              paidById: anaMember,
              participantIds: [anaMember],
              splitMethod: 'exact',
              exactShares: { [brunoMember]: 100 },
              lineItems: [
                { memberId: brunoMember, description: 'x', amount: 100 },
              ],
            }),
          ),
          yield* carla.device.post(path, expense({ paidById: anaMember })),
        ].map((response) => [response.status, response.body]);

        expect(results).toEqual([
          [
            400,
            {
              _tag: 'GroupExpensePayerInvalid',
              error: 'El pagador no pertenece al grupo',
            },
          ],
          [
            400,
            {
              _tag: 'GroupExpenseCategoryInvalid',
              error: 'La categoría no pertenece al grupo',
            },
          ],
          [
            400,
            {
              _tag: 'GroupExpenseParticipantsInvalid',
              error: 'El desglose contiene participantes inválidos',
            },
          ],
          [400, DENIED],
        ]);
        expect(yield* app.db.query('select id from expense')).toEqual([]);
      }),
    );

    testEffect('rejects payloads that do not add up', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember, brunoMember } = yield* trip(app);
        const path = `/api/groups/${group}/expenses`;

        for (const body of [
          expense({ participantIds: [anaMember] }),
          expense({ paidById: anaMember, amount: 0 }),
          expense({ paidById: anaMember, currency: '' }),
          expense({
            paidByIds: [anaMember, brunoMember],
            payers: [
              { memberId: anaMember, amount: 10 },
              { memberId: brunoMember, amount: 10 },
            ],
          }),
          expense({
            paidById: anaMember,
            participantIds: [anaMember],
            lineItems: [{ memberId: anaMember, description: 'x', amount: 100 }],
          }),
          expense({
            paidById: anaMember,
            participantIds: [anaMember],
            splitMethod: 'exact',
            exactShares: { [anaMember]: 100 },
            lineItems: [{ memberId: anaMember, description: 'x', amount: 10 }],
          }),
          expense({ paidById: anaMember, advancedDetails: { email: 'nope' } }),
        ]) {
          const response = yield* ana.device.post(path, body);
          expect([response.status, response.body._tag]).toEqual([
            400,
            'InvalidRequest',
          ]);
        }
      }),
    );

    testEffect('notifies the other people involved, not the author', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, bruno, group, anaMember, brunoMember } = yield* trip(app);

        yield* ana.device.post(
          `/api/groups/${group}/expenses`,
          expense({
            description: 'Cena',
            paidById: anaMember,
            participantIds: [anaMember, brunoMember],
          }),
        );
        yield* ana.device.post(
          `/api/groups/${group}/expenses`,
          expense({ paidById: anaMember, participantIds: [anaMember] }),
        );
        const sent = yield* waitFor(() =>
          app.push.sent.find((s) => s.payload.type === 'expense.created'),
        );
        yield* Effect.sleep('100 millis');

        expect(
          app.push.sent.filter((s) => s.payload.type === 'expense.created'),
        ).toHaveLength(1);
        expect(sent?.userIds).toEqual([bruno.id]);
        expect(sent?.payload).toMatchObject({
          title: 'Nuevo gasto en Viaje',
          body: expect.stringContaining('por Cena'),
          groupId: group,
        });
      }),
    );

    testEffect(
      'answers 500 when the attachment cannot be stored, after saving the expense',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember } = yield* trip(app);

          const response = yield* ana.device.post(
            `/api/groups/${group}/expenses`,
            expense({
              paidById: anaMember,
              attachmentImage: { dataUrl: 'not-a-data-url' },
            }),
          );

          expect([response.status, response.body._tag]).toEqual([
            500,
            'InternalError',
          ]);
          expect(yield* app.db.query('select attachment from expense')).toEqual(
            [{ attachment: null }],
          );
          expect(DATA_URL).toContain('base64');
        }),
    );

    testEffect(
      'only accepts a finance account of the author on a personal group',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');
          const { id } = yield* createGroup(ana.device, { type: 'personal' });
          const member = yield* memberIdOf(app, id, ana.id);
          yield* app.db.query(
            `insert into finance_account (id, "ownerId", name, currency, "currentBalance", "availableBalance", "updatedAt")
           values ('acc1', $1, 'Efectivo', 'COP', 500, 500, now())`,
            [ana.id],
          );
          const path = `/api/groups/${id}/expenses`;

          const unknown = yield* ana.device.post(
            path,
            expense({ paidById: member, accountId: 'nope' }),
          );
          const valid = yield* ana.device.post(
            path,
            expense({ paidById: member, accountId: 'acc1' }),
          );
          const removed = yield* ana.device.delete(`${path}/${valid.body.id}`);

          expect([unknown.status, unknown.body._tag]).toEqual([
            500,
            'InternalError',
          ]);
          expect(valid.status).toBe(201);
          expect(removed.status).toBe(200);
          expect(
            yield* app.db.query('select "currentBalance" from finance_account'),
          ).toEqual([{ currentBalance: 500 }]);
        }),
    );
  });
});
