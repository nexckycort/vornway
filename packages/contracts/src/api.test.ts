import { describe, expect, test } from 'bun:test';
import { OpenApi } from 'effect/http-api';
import { Api } from './api.ts';

describe('Api contract', () => {
  test('exposes the routes and statuses clients rely on', () => {
    const { paths } = OpenApi.fromApi(Api);

    const surface = Object.entries(paths).flatMap(([path, operations]) =>
      Object.entries(operations).map(
        ([method, operation]) =>
          `${method.toUpperCase()} ${path} → ${Object.keys(
            (operation as { responses: object }).responses,
          ).join(' ')}`,
      ),
    );

    expect(surface).toEqual([
      'GET /api/users/search → 200 400 401 500 503',
      'PATCH /api/users/me/username → 200 400 401 404 409 500 503',
      'PATCH /api/users/me/image → 200 400 401 404 500 503',
    ]);
  });
});

describe('Lists', () => {
  test('are paginated with a cursor, never a bare array', () => {
    const spec = OpenApi.fromApi(Api);
    const resolve = (schema: { $ref?: string; type?: string }) =>
      schema.$ref
        ? (spec.components.schemas[schema.$ref.split('/').at(-1) ?? ''] as {
            type?: string;
          })
        : schema;

    const bareArrays = Object.entries(spec.paths).flatMap(
      ([path, operations]) =>
        Object.entries(operations).flatMap(([method, operation]) =>
          Object.values(
            (
              operation as {
                responses: Record<
                  string,
                  { content?: Record<string, { schema: object }> }
                >;
              }
            ).responses,
          )
            .flatMap((response) => Object.values(response.content ?? {}))
            .filter(({ schema }) => resolve(schema).type === 'array')
            .map(() => `${method.toUpperCase()} ${path}`),
        ),
    );

    expect(bareArrays).toEqual([]);
  });
});
