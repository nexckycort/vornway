import { describe, expect } from 'bun:test';
import { Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';
import { parseJson, stringifyJson } from '../../../testkit/json';

type RpcResponse = {
  readonly result?: Record<string, unknown>;
  readonly error?: { readonly code: number; readonly message: string };
};

const issueToken = (app: TestApp, email: string) =>
  Effect.gen(function* () {
    const device = app.device();
    yield* device.post('/api/login/send-otp', { email, name: 'Ana' });
    const issued = yield* device.post('/api/login/mcp-token', {
      email,
      otp: app.email.otpFor(email),
    });
    const user = issued.body.user as { id: string };
    return { token: issued.body.accessToken as string, userId: user.id };
  });

const rpc = (
  app: TestApp,
  token: string,
  body: { readonly method: string; readonly params?: object },
) =>
  Effect.gen(function* () {
    const response = yield* app.fetch('/mcp', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: stringifyJson({ jsonrpc: '2.0', id: 1, ...body }),
    });
    const text = yield* Effect.promise(() => response.text());
    const data = text
      .split('\n')
      .find((line) => line.startsWith('data: '))
      ?.slice('data: '.length);
    return {
      status: response.status,
      message: (data ? parseJson(data) : null) as RpcResponse | null,
    };
  });

describe('mcp', () => {
  describe('authentication', () => {
    testEffect(
      'asks for a bearer token and points at the OAuth endpoints',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();

          const response = yield* app.fetch('/mcp', { method: 'POST' });

          expect(response.status).toBe(401);
          expect(response.headers.get('cache-control')).toBe('no-store');
          expect(response.headers.get('www-authenticate')).toBe(
            'Bearer realm="mcp", authorization_uri="http://localhost:3000/oauth/authorize", token_uri="http://localhost:3000/oauth/token", registration_uri="http://localhost:3000/oauth/register", resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"',
          );
          expect(yield* Effect.promise(() => response.json())).toEqual({
            error: 'UNAUTHORIZED',
            message: 'Missing bearer token',
            authorization_endpoint: 'http://localhost:3000/oauth/authorize',
            token_endpoint: 'http://localhost:3000/oauth/token',
            registration_endpoint: 'http://localhost:3000/oauth/register',
            resource_metadata:
              'http://localhost:3000/.well-known/oauth-protected-resource',
          });
        }),
    );

    testEffect('builds those URLs from the forwarded host', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* app.fetch('/mcp', {
          method: 'POST',
          headers: {
            'x-forwarded-proto': 'https, http',
            'x-forwarded-host': 'api.vornway.com',
          },
        });
        const body = (yield* Effect.promise(() => response.json())) as {
          token_endpoint: string;
        };

        expect(body.token_endpoint).toBe('https://api.vornway.com/oauth/token');
      }),
    );

    testEffect('refuses a token it did not sign', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const forged = yield* app.fetch('/mcp', {
          method: 'POST',
          headers: { authorization: 'Bearer a.b.c' },
        });
        const basic = yield* app.fetch('/mcp', {
          method: 'POST',
          headers: { authorization: 'Basic abc' },
        });

        expect(forged.status).toBe(401);
        expect(yield* Effect.promise(() => forged.json())).toMatchObject({
          message: 'Invalid or expired bearer token',
        });
        expect(yield* Effect.promise(() => basic.json())).toMatchObject({
          message: 'Missing bearer token',
        });
      }),
    );
  });

  describe('protocol', () => {
    testEffect('introduces the server', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { token } = yield* issueToken(app, 'ana@gmail.com');

        const initialized = yield* rpc(app, token, {
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'test', version: '1' },
          },
        });

        expect(initialized.status).toBe(200);
        expect(initialized.message?.result).toMatchObject({
          serverInfo: { name: 'vornway', version: '0.0.1' },
          capabilities: { tools: expect.any(Object) },
        });
      }),
    );

    testEffect('lists the expenses health tool', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { token } = yield* issueToken(app, 'ana@gmail.com');

        const listed = yield* rpc(app, token, { method: 'tools/list' });

        expect(listed.message?.result?.tools).toEqual([
          expect.objectContaining({
            name: 'expenses_health',
            title: 'Expenses Health',
            description: 'Healthcheck del modulo expenses',
          }),
        ]);
      }),
    );

    testEffect('runs the health tool as the user the token belongs to', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const ana = yield* issueToken(app, 'ana@gmail.com');
        const bruno = yield* issueToken(app, 'bruno@gmail.com');
        const call = {
          method: 'tools/call',
          params: { name: 'expenses_health', arguments: {} },
        };

        const anaResult = yield* rpc(app, ana.token, call);
        const brunoResult = yield* rpc(app, bruno.token, call);

        expect(anaResult.message?.result).toEqual({
          content: [
            {
              type: 'text',
              text: stringifyJson({
                module: 'expenses',
                status: 'ok',
                userId: ana.userId,
              }),
            },
          ],
          structuredContent: {
            module: 'expenses',
            status: 'ok',
            userId: ana.userId,
          },
        });
        expect(brunoResult.message?.result?.structuredContent).toMatchObject({
          userId: bruno.userId,
        });
        expect(ana.userId).not.toBe(bruno.userId);
      }),
    );

    testEffect('answers a protocol error for an unknown tool', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { token } = yield* issueToken(app, 'ana@gmail.com');

        const called = yield* rpc(app, token, {
          method: 'tools/call',
          params: { name: 'nope', arguments: {} },
        });

        expect(called.message?.error ?? called.message?.result).toBeDefined();
      }),
    );
  });
});
