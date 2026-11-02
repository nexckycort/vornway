import { describe, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { Effect } from 'effect';
import { makeTestApp, type TestApp } from '../../../testkit/app';
import { testEffect } from '../../../testkit/effect';

const REDIRECT = 'https://claude.ai/api/mcp/callback';
const VERIFIER = 'a-code-verifier-that-is-long-enough-to-be-valid-0123456789';
const CHALLENGE = createHash('sha256').update(VERIFIER).digest('base64url');

const form = (app: TestApp, path: string, fields: Record<string, string>) =>
  app.fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });

const json = (response: Response) =>
  Effect.promise(() => response.json() as Promise<Record<string, unknown>>);

const authorizeFields = (
  otp: string,
  overrides: Record<string, string> = {},
) => ({
  client_id: 'claude',
  redirect_uri: REDIRECT,
  resource: 'http://localhost:3000/mcp',
  scope: 'mcp:tools',
  state: 'xyz',
  code_challenge: CHALLENGE,
  code_challenge_method: 'S256',
  email: 'ana@gmail.com',
  otp,
  ...overrides,
});

const requestOtp = (app: TestApp) =>
  Effect.gen(function* () {
    const known = app.email.messages.length > 0;
    yield* app.device().post('/api/login/send-otp', {
      email: 'ana@gmail.com',
      ...(known ? {} : { name: 'Ana' }),
    });
    return app.email.otpFor('ana@gmail.com');
  });

const authorizeCode = (app: TestApp, overrides: Record<string, string> = {}) =>
  Effect.gen(function* () {
    const otp = yield* requestOtp(app);
    const response = yield* form(
      app,
      '/oauth/authorize',
      authorizeFields(otp, overrides),
    );
    const location = new URL(response.headers.get('location') ?? REDIRECT);
    return {
      response,
      code: location.searchParams.get('code') ?? '',
      location,
    };
  });

const exchange = (app: TestApp, fields: Record<string, string>) =>
  form(app, '/oauth/token', {
    grant_type: 'authorization_code',
    client_id: 'claude',
    redirect_uri: REDIRECT,
    code_verifier: VERIFIER,
    ...fields,
  });

describe('oauth', () => {
  describe('metadata', () => {
    testEffect(
      'describes the authorization server from the request origin',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();

          const response = yield* app.fetch(
            '/.well-known/oauth-authorization-server',
          );

          expect(response.status).toBe(200);
          expect(response.headers.get('cache-control')).toBe('no-store');
          expect(yield* json(response)).toEqual({
            issuer: 'http://localhost:3000',
            authorization_endpoint: 'http://localhost:3000/oauth/authorize',
            token_endpoint: 'http://localhost:3000/oauth/token',
            registration_endpoint: 'http://localhost:3000/oauth/register',
            client_registration_endpoint:
              'http://localhost:3000/oauth/register',
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code'],
            code_challenge_methods_supported: ['S256', 'plain'],
            token_endpoint_auth_methods_supported: ['none'],
            scopes_supported: ['mcp:tools'],
          });
        }),
    );

    testEffect('serves it under every discovery path clients try', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const paths = [
          '/.well-known/oauth-authorization-server/oauth',
          '/.well-known/openid-configuration',
          '/.well-known/openid-configuration/oauth',
          '/oauth/.well-known/oauth-authorization-server',
          '/oauth/.well-known/oauth-authorization-server/oauth',
        ];

        const bodies = yield* Effect.forEach(paths, (path) =>
          Effect.flatMap(app.fetch(path), json),
        );

        expect(bodies.map((body) => body.issuer)).toEqual(
          paths.map(() => 'http://localhost:3000'),
        );
      }),
    );

    testEffect('describes the MCP resource, following the forwarded host', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const headers = {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'api.vornway.com',
        };

        const bodies = yield* Effect.forEach(
          [
            '/.well-known/oauth-protected-resource',
            '/mcp/.well-known/oauth-protected-resource',
          ],
          (path) => Effect.flatMap(app.fetch(path, { headers }), json),
        );

        for (const body of bodies) {
          expect(body).toEqual({
            resource: 'https://api.vornway.com/mcp',
            authorization_servers: ['https://api.vornway.com'],
            bearer_methods_supported: ['header'],
            scopes_supported: ['mcp:tools'],
          });
        }
      }),
    );
  });

  describe('register', () => {
    const register = (app: TestApp, body: object) =>
      app.fetch('/oauth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

    testEffect('issues a public client for safe redirect URIs', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* register(app, {
          client_name: 'Claude',
          redirect_uris: [REDIRECT, 'http://localhost:6274/callback'],
        });
        const body = yield* json(response);

        expect(response.status).toBe(201);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(body).toMatchObject({
          client_id: expect.stringMatching(/^mcp_[0-9a-f]{32}$/),
          client_id_issued_at: expect.any(Number),
          client_name: 'Claude',
          redirect_uris: [REDIRECT, 'http://localhost:6274/callback'],
          grant_types: ['authorization_code'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
        });
      }),
    );

    testEffect('refuses insecure redirects and confidential clients', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const responses = yield* Effect.all([
          register(app, { redirect_uris: ['http://evil.example/callback'] }),
          register(app, {
            redirect_uris: [REDIRECT],
            token_endpoint_auth_method: 'client_secret_basic',
          }),
          register(app, { redirect_uris: [] }),
          register(app, {}),
        ]);

        expect(responses.map((response) => response.status)).toEqual([
          400, 400, 400, 400,
        ]);
        expect(yield* json(responses[0] as Response)).toEqual({
          error: 'invalid_client_metadata',
        });
      }),
    );

    testEffect('lets a registered client authorize only its own redirect', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const registered = yield* json(
          yield* register(app, { redirect_uris: [REDIRECT] }),
        );
        const clientId = String(registered.client_id);
        const query = (redirect: string) =>
          `/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}`;

        const own = yield* app.fetch(query(REDIRECT));
        const other = yield* app.fetch(query('https://other.example/cb'));

        expect(own.status).toBe(200);
        expect(other.status).toBe(400);
        expect(yield* json(other)).toEqual({ error: 'invalid_client' });
      }),
    );
  });

  describe('authorize page', () => {
    testEffect('renders the login form for a client it can trust', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* app.fetch(
          `/oauth/authorize?client_id=claude&redirect_uri=${encodeURIComponent(REDIRECT)}&state=xyz&code_challenge=${CHALLENGE}&code_challenge_method=S256`,
        );
        const html = yield* Effect.promise(() => response.text());

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('text/html');
        expect(html).toContain('<strong>claude</strong> quiere conectarse');
        expect(html).toContain(
          'name="resource" value="http://localhost:3000/mcp"',
        );
        expect(html).toContain('name="scope" value="mcp:tools"');
        expect(html).toContain('name="state" value="xyz"');
        expect(html).toContain(`name="code_challenge" value="${CHALLENGE}"`);
        expect(html).toContain('action="/oauth/authorize"');
      }),
    );

    testEffect('escapes what the client controls', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* app.fetch(
          `/oauth/authorize?client_id=${encodeURIComponent('"><script>alert(1)</script>')}&redirect_uri=${encodeURIComponent(REDIRECT)}`,
        );
        const html = yield* Effect.promise(() => response.text());

        expect(html).not.toContain('<script>alert(1)');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      }),
    );

    testEffect('refuses redirects that are not https or localhost', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* app.fetch(
          '/oauth/authorize?client_id=claude&redirect_uri=http%3A%2F%2Fevil.example%2Fcb',
        );

        expect(response.status).toBe(400);
        expect(yield* json(response)).toEqual({ error: 'invalid_client' });
      }),
    );

    testEffect('refuses a request without the required parameters', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* app.fetch('/oauth/authorize?client_id=claude');

        expect(response.status).toBe(400);
        expect(yield* json(response)).toEqual({ error: 'invalid_request' });
      }),
    );
  });

  describe('authorization code flow', () => {
    testEffect('redirects with a code and trades it for a token', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { response, code, location } = yield* authorizeCode(app);

        expect(response.status).toBe(302);
        expect(`${location.origin}${location.pathname}`).toBe(REDIRECT);
        expect(location.searchParams.get('state')).toBe('xyz');

        const token = yield* exchange(app, { code });
        const body = yield* json(token);
        const accessToken = String(body.access_token);

        expect(token.status).toBe(200);
        expect(token.headers.get('cache-control')).toBe('no-store');
        expect(body).toMatchObject({
          access_token: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
          token_type: 'Bearer',
          expires_in: 60 * 60 * 24 * 30,
          scope: 'mcp:tools',
          resource: 'http://localhost:3000/mcp',
        });

        const mcp = yield* app.fetch('/mcp', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${accessToken}`,
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
        });
        expect(yield* Effect.promise(() => mcp.text())).toContain(
          'expenses_health',
        );
        expect(mcp.status).toBe(200);
      }),
    );

    testEffect('accepts a browser form that leaves the PKCE fields empty', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { response, code } = yield* authorizeCode(app, {
          state: '',
          code_challenge: '',
          code_challenge_method: '',
        });

        const token = yield* exchange(app, { code, code_verifier: '' });

        expect(response.status).toBe(302);
        expect(
          new URL(response.headers.get('location') ?? '').searchParams.has(
            'state',
          ),
        ).toBe(false);
        expect(token.status).toBe(200);
      }),
    );

    testEffect(
      'shows the form again with the reason when the code is wrong',
      () =>
        Effect.gen(function* () {
          const app = yield* makeTestApp();
          yield* requestOtp(app);

          const response = yield* form(
            app,
            '/oauth/authorize',
            authorizeFields('000000'),
          );
          const html = yield* Effect.promise(() => response.text());

          expect(response.status).toBe(401);
          expect(response.headers.get('location')).toBeNull();
          expect(html).toContain(
            '<div class="error">Código OTP incorrecto o expirado</div>',
          );
        }),
    );

    testEffect('refuses an authorization for an untrusted redirect', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const otp = yield* requestOtp(app);

        const response = yield* form(
          app,
          '/oauth/authorize',
          authorizeFields(otp, { redirect_uri: 'http://evil.example/cb' }),
        );

        expect(response.status).toBe(400);
        expect(yield* json(response)).toEqual({ error: 'invalid_client' });
      }),
    );

    testEffect('refuses an incomplete authorization form', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* form(app, '/oauth/authorize', {
          client_id: 'claude',
        });

        expect(response.status).toBe(400);
        expect(yield* json(response)).toEqual({ error: 'invalid_request' });
      }),
    );

    testEffect('hands a code out once', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const { code } = yield* authorizeCode(app);

        const first = yield* exchange(app, { code });
        const second = yield* exchange(app, { code });

        expect(first.status).toBe(200);
        expect(second.status).toBe(400);
        expect(yield* json(second)).toEqual({ error: 'invalid_grant' });
      }),
    );

    testEffect('checks the verifier, the client and the redirect', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();
        const wrongVerifier = yield* authorizeCode(app);
        const wrongClient = yield* authorizeCode(app);
        const wrongRedirect = yield* authorizeCode(app);

        const responses = yield* Effect.all([
          exchange(app, {
            code: wrongVerifier.code,
            code_verifier: 'x'.repeat(50),
          }),
          exchange(app, { code: wrongClient.code, client_id: 'other' }),
          exchange(app, {
            code: wrongRedirect.code,
            redirect_uri: 'https://other.example/cb',
          }),
          exchange(app, { code: 'unknown' }),
        ]);

        expect(responses.map((response) => response.status)).toEqual([
          400, 400, 400, 400,
        ]);
        for (const response of responses) {
          expect(yield* json(response)).toEqual({ error: 'invalid_grant' });
        }
      }),
    );

    testEffect('refuses a token request with another grant type', () =>
      Effect.gen(function* () {
        const app = yield* makeTestApp();

        const response = yield* exchange(app, {
          grant_type: 'password',
          code: 'x',
        });

        expect(response.status).toBe(400);
        expect(yield* json(response)).toEqual({ error: 'invalid_request' });
      }),
    );
  });
});
