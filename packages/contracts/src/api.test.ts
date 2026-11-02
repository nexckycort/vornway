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
      'GET /api/admin/stats → 200 400 401 403 500 503',
      'GET /api/admin/feedback → 200 400 401 403 500 503',
      'PATCH /api/admin/feedback/{feedbackId} → 200 400 401 403 404 500 503',
      'GET /api/converter → 200 400 401 500 503',
      'GET /api/debts → 200 400 401 500 503',
      'POST /api/debts → 201 400 401 404 500 503',
      'GET /api/debts/{id} → 200 400 401 404 500 503',
      'PATCH /api/debts/{id} → 200 400 401 404 500 503',
      'DELETE /api/debts/{id} → 200 400 401 404 500 503',
      'POST /api/debts/{id}/amounts → 201 400 401 404 500 503',
      'PATCH /api/debts/{id}/amounts/{amountId} → 200 400 401 404 500 503',
      'DELETE /api/debts/{id}/amounts/{amountId} → 200 400 401 404 500 503',
      'POST /api/debts/{id}/payments → 201 400 401 404 500 503',
      'PATCH /api/debts/{id}/payments/{paymentId} → 200 400 401 404 500 503',
      'DELETE /api/debts/{id}/payments/{paymentId} → 200 400 401 404 500 503',
      'GET /api/feedback → 200 400 401 500 503',
      'POST /api/feedback → 201 400 401 500 503',
      'DELETE /api/feedback/{feedbackId} → 200 400 401 404 500 503',
      'GET /api/finances/summary → 200 400 401 500 503',
      'GET /api/finances/transactions → 200 400 401 500 503',
      'POST /api/finances/transactions → 201 400 401 500 503',
      'GET /api/finances/movements → 200 400 401 500 503',
      'GET /api/finances/accounts → 200 400 401 500 503',
      'POST /api/finances/accounts → 201 400 401 500 503',
      'GET /api/finances/accounts/{id} → 200 400 401 404 500 503',
      'PATCH /api/finances/accounts/{id} → 200 400 401 404 500 503',
      'DELETE /api/finances/accounts/{id} → 200 400 401 404 500 503',
      'GET /api/finances/accounts/{id}/movements → 200 400 401 404 500 503',
      'POST /api/finances/accounts/{id}/close → 200 400 401 404 500 503',
      'GET /api/finances/transactions/{id} → 200 400 401 404 500 503',
      'PATCH /api/finances/transactions/{id} → 200 400 401 404 500 503',
      'DELETE /api/finances/transactions/{id} → 200 400 401 404 500 503',
      'POST /api/finances/categories → 201 400 401 500 503',
      'PATCH /api/finances/categories/{id} → 200 400 401 404 409 500 503',
      'DELETE /api/finances/categories/{id} → 200 400 401 404 500 503',
      'POST /api/finances/budgets → 201 400 401 500 503',
      'GET /api/goals → 200 400 401 500 503',
      'POST /api/goals → 201 400 401 500 503',
      'GET /api/goals/{id} → 200 400 401 404 500 503',
      'PATCH /api/goals/{id} → 200 400 401 404 500 503',
      'POST /api/goals/{id}/contributions → 201 400 401 403 404 500 503',
      'DELETE /api/goals/{id}/contributions/{contributionId} → 200 400 401 403 404 500 503',
      'POST /api/groups → 201 400 401 500 503',
      'GET /api/groups → 200 400 401 500 503',
      'GET /api/groups/{id} → 200 400 401 404 500 503',
      'DELETE /api/groups/{id} → 200 400 401 404 500 503',
      'PATCH /api/groups/{id} → 200 400 401 404 500 503',
      'GET /api/groups/{id}/export → 200 400 401 404 500 503',
      'PATCH /api/groups/{id}/owner → 200 400 401 403 500 503',
      'PATCH /api/groups/{id}/settings → 200 400 401 404 500 503',
      'PATCH /api/groups/{id}/image → 200 400 401 404 500 503',
      'POST /api/groups/{id}/categories → 201 400 401 404 500 503',
      'PATCH /api/groups/{id}/categories/{categoryId} → 200 400 401 404 409 500 503',
      'DELETE /api/groups/{id}/categories/{categoryId} → 200 400 401 404 409 500 503',
      'POST /api/groups/{id}/categories/{categoryId}/move-expenses → 200 400 401 404 500 503',
      'GET /api/groups/{id}/reports/totals → 200 400 401 404 500 503',
      'GET /api/groups/{id}/reports/category-count → 200 400 401 404 500 503',
      'GET /api/groups/{id}/reports/balances → 200 400 401 404 500 503',
      'GET /api/groups/{id}/reports/shares → 200 400 401 404 500 503',
      'GET /api/groups/{id}/expenses → 200 400 401 404 500 503',
      'POST /api/groups/{id}/expenses → 201 400 401 500 503',
      'GET /api/groups/{id}/members/{memberId}/expenses → 200 400 401 404 500 503',
      'GET /api/groups/{id}/expenses/{expenseId} → 200 400 401 404 500 503',
      'PUT /api/groups/{id}/expenses/{expenseId} → 200 400 401 500 503',
      'DELETE /api/groups/{id}/expenses/{expenseId} → 200 400 401 500 503',
      'POST /api/groups/{id}/settlements → 201 400 401 500 503',
      'GET /api/groups/{id}/members/search → 200 400 401 500 503',
      'POST /api/groups/{id}/members → 201 400 401 500 503',
      'DELETE /api/groups/{id}/members/{memberId}/account-link → 200 400 401 500 503',
      'DELETE /api/groups/{id}/members/{memberId} → 200 400 401 500 503',
      'GET /api/home → 200 400 401 500 503',
      'GET /api/invites/{inviteCode} → 200 400 401 404 500 503',
      'POST /api/invites/{inviteCode}/accept → 201 400 401 404 500 503',
      'POST /api/login/send-otp → 200 400 404 409 500',
      'POST /api/login/verify-otp → 200 400 401 500',
      'POST /api/login/sync-google → 200 400 401 500',
      'POST /api/login/mcp-token → 200 400 401 500',
      'GET /api/login/me → 200 400 401 500',
      'POST /api/maps/resolve → 200 400 401 500 503',
      'GET /api/notifications → 200 400 401 500 503',
      'POST /api/notifications/read-all → 200 400 401 500 503',
      'POST /api/push/subscriptions → 201 400 401 500 503',
      'DELETE /api/push/subscriptions → 200 400 401 500 503',
      'POST /api/push/test → 200 400 401 500 503',
      'POST /api/push/native-subscriptions → 201 400 401 500 503',
      'DELETE /api/push/native-subscriptions → 200 400 401 500 503',
      'GET /api/quick-splits/expenses → 200 400 401 500 503',
      'POST /api/quick-splits → 201 400 401 500 503',
      'POST /api/quick-splits/{id}/expenses → 201 400 401 404 500 503',
      'POST /api/quick-splits/{id}/expenses/{expenseId}/settlements → 201 400 401 404 500 503',
      'PUT /api/quick-splits/{id}/expenses/{expenseId} → 200 400 401 404 500 503',
      'GET /api/quick-splits/{id}/expenses/{expenseId} → 200 400 401 404 500 503',
      'DELETE /api/quick-splits/{id}/expenses/{expenseId} → 200 400 401 404 500 503',
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

    expect(bareArrays).toEqual([
      'GET /api/debts',
      'GET /api/finances/transactions',
    ]);
  });
});
