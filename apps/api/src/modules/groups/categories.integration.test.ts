import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { signIn } from '../../../testkit/login';
import { createExpense, createGroup, trip } from './test-support';

const NOT_FOUND = { _tag: 'GroupNotFound', error: 'Grupo no encontrado' };

describe('group categories', () => {
  describe('create', () => {
    testEffect(
      'trims the fields and reuses a category with the same name',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const ana = yield* signIn(app, 'ana@vornway.test');
          const { id } = yield* createGroup(ana.device);

          const created = yield* ana.device.post(
            `/api/groups/${id}/categories`,
            {
              name: '  Comida ',
              icon: ' 🍕 ',
              color: '#FF0000',
            },
          );
          const same = yield* ana.device.post(`/api/groups/${id}/categories`, {
            name: 'comida',
          });

          expect(created.status).toBe(201);
          expect(created.body).toEqual({
            id: expect.any(String),
            name: 'Comida',
            icon: '🍕',
            color: '#FF0000',
          });
          expect([same.status, same.body]).toEqual([201, created.body]);
          expect(
            yield* app.db.query('select name from expense_category'),
          ).toHaveLength(1);
        }),
    );

    testEffect('rejects a blank name and a malformed color', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const { id } = yield* createGroup(ana.device);

        const blank = yield* ana.device.post(`/api/groups/${id}/categories`, {
          name: '   ',
        });
        const color = yield* ana.device.post(`/api/groups/${id}/categories`, {
          name: 'Comida',
          color: 'red',
        });

        expect([blank.status, blank.body]).toEqual([
          400,
          {
            _tag: 'GroupCategoryNameRequired',
            error: 'El nombre de la categoría es obligatorio',
          },
        ]);
        expect([color.status, color.body._tag]).toEqual([
          400,
          'InvalidRequest',
        ]);
      }),
    );
  });

  describe('update', () => {
    testEffect('changes and clears fields', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const { id } = yield* createGroup(ana.device);
        const category = yield* ana.device.post(
          `/api/groups/${id}/categories`,
          {
            name: 'Comida',
            icon: '🍕',
            color: '#FF0000',
          },
        );
        const path = `/api/groups/${id}/categories/${category.body.id}`;

        const renamed = yield* ana.device.patch(path, { name: ' Cenas ' });
        const cleared = yield* ana.device.patch(path, {
          icon: null,
          color: null,
        });

        expect(renamed.body).toEqual({
          id: category.body.id,
          name: 'Cenas',
          icon: '🍕',
          color: '#FF0000',
        });
        expect(cleared.body).toEqual({
          id: category.body.id,
          name: 'Cenas',
          icon: null,
          color: null,
        });
      }),
    );

    testEffect('explains why an update is refused', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* signIn(app, 'ana@vornway.test');
        const { id } = yield* createGroup(ana.device);
        const first = yield* ana.device.post(`/api/groups/${id}/categories`, {
          name: 'Comida',
        });
        const second = yield* ana.device.post(`/api/groups/${id}/categories`, {
          name: 'Taxis',
        });
        const base = `/api/groups/${id}/categories`;

        const conflict = yield* ana.device.patch(`${base}/${second.body.id}`, {
          name: 'COMIDA',
        });
        const blank = yield* ana.device.patch(`${base}/${first.body.id}`, {
          name: '  ',
        });
        const unknown = yield* ana.device.patch(`${base}/unknown`, {
          name: 'X',
        });
        const empty = yield* ana.device.patch(`${base}/${first.body.id}`, {});

        expect([conflict.status, conflict.body]).toEqual([
          409,
          {
            _tag: 'GroupCategoryNameConflict',
            error: 'Ya existe una categoría con ese nombre',
          },
        ]);
        expect([blank.status, blank.body._tag]).toEqual([
          400,
          'GroupCategoryNameRequired',
        ]);
        expect([unknown.status, unknown.body]).toEqual([
          404,
          { _tag: 'GroupCategoryNotFound', error: 'Categoría no encontrada' },
        ]);
        expect([empty.status, empty.body._tag]).toEqual([
          400,
          'InvalidRequest',
        ]);
      }),
    );
  });

  describe('delete and move', () => {
    testEffect(
      'refuses to delete a category with expenses until they are moved',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          const { ana, group, anaMember } = yield* trip(app);
          const base = `/api/groups/${group}/categories`;
          const food = (yield* ana.device.post(base, { name: 'Comida' })).body
            .id;
          const taxis = (yield* ana.device.post(base, { name: 'Taxis' })).body
            .id;
          yield* createExpense(ana.device, group, {
            paidById: anaMember,
            categoryId: food,
          });
          yield* createExpense(ana.device, group, {
            paidById: anaMember,
            categoryId: food,
          });

          const blocked = yield* ana.device.delete(`${base}/${food}`);
          const same = yield* ana.device.post(`${base}/${food}/move-expenses`, {
            targetCategoryId: food,
          });
          const missing = yield* ana.device.post(
            `${base}/${food}/move-expenses`,
            {
              targetCategoryId: 'unknown',
            },
          );
          const moved = yield* ana.device.post(
            `${base}/${food}/move-expenses`,
            {
              targetCategoryId: taxis,
            },
          );
          const deleted = yield* ana.device.delete(`${base}/${food}`);

          expect([blocked.status, blocked.body]).toEqual([
            409,
            {
              _tag: 'GroupCategoryHasExpenses',
              error: 'La categoría tiene gastos asociados',
            },
          ]);
          expect([same.status, same.body._tag]).toEqual([
            400,
            'GroupCategoryTargetSame',
          ]);
          expect([missing.status, missing.body._tag]).toEqual([
            404,
            'GroupCategoryTargetNotFound',
          ]);
          expect(moved.body).toEqual({
            categoryId: food,
            targetCategoryId: taxis,
            movedExpenseCount: 2,
          });
          expect(deleted.body).toEqual({ id: food });
        }),
    );

    testEffect('moves expenses to no category when no target is given', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { ana, group, anaMember } = yield* trip(app);
        const base = `/api/groups/${group}/categories`;
        const food = (yield* ana.device.post(base, { name: 'Comida' })).body.id;
        yield* createExpense(ana.device, group, {
          paidById: anaMember,
          categoryId: food,
        });

        const moved = yield* ana.device.post(
          `${base}/${food}/move-expenses`,
          {},
        );

        expect(moved.body).toEqual({
          categoryId: food,
          targetCategoryId: null,
          movedExpenseCount: 1,
        });
        expect(yield* app.db.query('select "categoryId" from expense')).toEqual(
          [{ categoryId: null }],
        );
      }),
    );
  });

  testEffect('belong to their group: nobody else can read or change them', () =>
    Effect.gen(function* () {
      const app = yield* makeTestApp();
      const { ana, group } = yield* trip(app);
      const carla = yield* signIn(app, 'carla@vornway.test');
      const other = (yield* createGroup(carla.device)).id;
      const category = (yield* ana.device.post(
        `/api/groups/${group}/categories`,
        {
          name: 'Comida',
        },
      )).body.id;
      const base = `/api/groups/${group}/categories`;

      const outsider = yield* Effect.all([
        carla.device.post(base, { name: 'Intruso' }),
        carla.device.patch(`${base}/${category}`, { name: 'Intruso' }),
        carla.device.delete(`${base}/${category}`),
        carla.device.post(`${base}/${category}/move-expenses`, {}),
      ]);
      const crossGroup = yield* carla.device.patch(
        `/api/groups/${other}/categories/${category}`,
        { name: 'Intruso' },
      );

      expect(outsider.map((r) => [r.status, r.body])).toEqual([
        [404, NOT_FOUND],
        [404, NOT_FOUND],
        [404, NOT_FOUND],
        [404, NOT_FOUND],
      ]);
      expect([crossGroup.status, crossGroup.body._tag]).toEqual([
        404,
        'GroupCategoryNotFound',
      ]);
      expect(yield* app.db.query('select name from expense_category')).toEqual([
        { name: 'Comida' },
      ]);
    }),
  );
});
