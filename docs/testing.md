# Testing

Tests use `bun:test` and sit next to the code they test. Each touched project has `bun run test`, `bun lint:fix`, `bun fmt:fix` and `bun typecheck`; run them from `apps/api`, `packages/contracts` or `packages/api-client`.

- `*.test.ts`: unit, pure logic, no I/O (`pagination.test.ts`, the contract tests).
- `*.integration.test.ts`: the real system in process (real Better Auth, real Postgres, the real router), faking only what leaves the server: email, storage and push.

## API integration tests

Server tests are integration tests only, using `apps/api/testkit/`:

```ts
testEffect('...', () =>
  Effect.gen(function* () {
    const app = yield* makeTestApp();
    const ana = yield* signIn(app, 'ana@vornway.test');
    const response = yield* ana.device.patch('/api/users/me/username', { username: 'ana' });
    expect(response.status).toBe(200);
  }),
);
```

- `makeTestApp()`: builds `AppRoutesNoDeps` with a fresh `Database`/Better Auth on the test database and no port. Returns `fetch(path, init)` (the raw `Response`, for HTML, redirects and form posts), `device()`, `db.query(sql, params)` (rows as plain objects, for asserting persisted state) and the fakes:
  - `email`: `messages`, `otpFor(address)`;
  - `storage`: `uploads`, `deleted`, and `objects` (a map to seed what `getObject` serves);
  - `push`: `subscriptions`, `revoked`, `sent`, and `unavailable = true` to make every call fail. Revoking only removes the caller's own subscription, like the real service;
  - `http`: `requests`, everything that went through `HttpClient`.

  Options: `http` (`(request) => Response`, answers outbound requests; the default answers 503, so an unexpected call fails visibly) and `extraRoutes` (a test-only `HttpApi`, how `AdminOnly` and `ErrorBoundary` are tested).
- `signIn(app, email)`: real email-OTP sign-in through `/api/auth/*`; returns `{ device, id, email }`. A `device` keeps its own cookies and has `get/post/put/patch/delete`, answering `{ status, body }`; `post/put/patch/delete` take an optional JSON body. Use one per simulated user.
- `testEffect(name, body)`: `bun:test` counterpart of `it.effect`; the body runs in a scope, so the app closes with the test.
- Logs are silent; set `TEST_LOGS=1` to see them.

Every resource that belongs to a user needs an isolation test and every paginated list a pagination test.

## Database

Tests need Postgres. `docker compose up -d postgres` (repo root) listens on `127.0.0.1:5433` (`vornway:vornway`), the default of `TEST_DATABASE_URL`. Point `TEST_DATABASE_URL` at any server where the role can `create database`.

`testkit/database.ts` runs `prisma migrate deploy` once into a template database named after a hash of `db/migrations`, copies it into a throwaway database per run, and `TRUNCATE`s every table before each `makeTestApp()`. The throwaway database is dropped after the run; templates are kept and rebuilt only when a migration changes (drop old `vornway_template_*` databases by hand when you like).

`bunfig.toml` preloads `testkit/setup.ts`, which closes the database after the run. Configuration comes from `testkit/config.ts` (dummy values for every variable `src/config/env.ts` reads, `TEST_ORIGIN` as the base URL).

## Contracts and the client

`packages/contracts/src/api.test.ts` lists every endpoint with its statuses and fails on a bare-array list response; update it on purpose when the surface changes. `packages/api-client` tests are unit tests on the generated client.
