# Testing

All tests use [`bun:test`](https://bun.com/docs/test). Each project is tested separately:

```sh
pnpm -r run test                    # the whole monorepo
cd apps/api && bun test          # one project
bun test src/infrastructure/auth    # one folder
bun test -t 'login by email'        # by name
bun run test:coverage               # with coverage (text + coverage/lcov.info)
```

CI (`.github/workflows/quality.yml`) runs `bun run test:coverage` in each project, after the typecheck. The table ends up in the job summary and `lcov.info` in the artifacts (`coverage-<project>`).

## Coverage

There is no minimum threshold: a mandatory percentage would push us to test code that is still going to change. When reading it:

- **Look at `% Funcs`.** Bun marks lines that run when the module is imported as covered, so `% Lines` comes out high even if nobody calls the functions.
- **Only files imported by the tests appear.** A module that no test loads doesn't show up as 0%, it simply doesn't show up.
- On the server, `testkit/` and `packages/` are excluded (`bunfig.toml`).

## Levels

The file suffix tells you what the test touches:

| Suffix                  | What it tests                                                                                     | Example                     |
| ----------------------- | ------------------------------------------------------------------------------------------------- | --------------------------- |
| `*.test.ts`             | Unit. Pure logic, no network, database or disk. Should take milliseconds.                         | `api.test.ts` (contracts)   |
| `*.integration.test.ts` | The real system end to end (routes, Better Auth, Postgres). Only what leaves the server is faked. | `login.integration.test.ts` |

If we ever need a test against a real service (SMS provider, Flypass in staging), it goes in `*.live.test.ts` and doesn't run in CI.

## Rules

- **Next to the code.** `client.ts` is tested in `client.test.ts`, in the same folder.
- **Test behavior, not implementation.** Verify what the caller sees (the HTTP response, the state of the flow, what got stored), not which internal functions were called.
- **Fakes only at the edge.** Replace what leaves the process (email, SMS, the legacy DB), never one of our own modules.
- **No `.env`.** Server tests read their configuration from `testConfig()`, never from `process.env`.
- **Deterministic.** No `sleep` and no fixed ports, and every test starts with an empty database. To control when something finishes, use `Promise.withResolvers`.

## Server

On the server we test with integration tests only. Any behavior can have one; these two checks are required:

- **Isolation between users**: one user never reads or changes another user's data (`modules/vehicles/vehicles.integration.test.ts`). Add the same check for every new resource that belongs to a user.
- **Pagination**: walking every cursor page returns each item once.

They need Postgres:

```sh
docker compose up -d postgres
cd apps/api && bun test
```

By default they use `postgres://flypass:flypass@127.0.0.1:5432/flypass` (the one from `docker-compose.yml`). To use another one, set `TEST_DATABASE_URL`. The whole server is tested in ~3 s.

This is how they stay fast:

- **Template with the schema.** The first run generates the schema from `src/db/schema` and stores it in Postgres as `flypass_template_<hash>`. Later runs copy it without loading `drizzle-kit` (~0.6 s). It is only regenerated when the schema changes.
- **One database per run.** Each `bun test` copies the template to `flypass_test_*`, empties it with `TRUNCATE` before each test (milliseconds) and drops it at the end (`testkit/setup.ts`, preloaded in `bunfig.toml`).
- **No `--concurrent`.** Tests share the database, so they run one after another, which is how `bun test` runs by default.

`apps/api/testkit/` holds the tools the tests use, not the tests themselves (those live next to each file in `src/`). It lives outside `src/` so it doesn't get mixed with production code:

- `testEffect(name, () => Effect)`: the equivalent of `it.effect` from `@effect/vitest`. Runs the Effect with a scope that closes when the test ends (database, handler).
- `makeTestApp()`: the real server in-process, without opening ports: `AppRoutesNoDeps`, Better Auth and Postgres. Only email, SMS (codes land in `app.inbox`) and FlyPass are fake. FlyPass is down unless the test passes `makeTestApp({ flypass: flypassResponds((request) => Response) })`.
- `app.device()`: a client that talks like the mobile app, with `expo-origin: mobile://` and its own cookies. Two `device()` calls are two different phones.
- `signInWithPhone` / `signInWithEmail`: request the code and submit the one that arrived in the inbox.
- `app.db.query(sql)`: to check what got stored.

```ts
testEffect('signs up a new user with a verified email', () =>
  Effect.gen(function* () {
    const app = yield* makeTestApp()
    const device = app.device()

    expect((yield* signInWithEmail(app, device, EMAIL)).status).toBe(200)
    expect(
      (yield* app.db.query('select email, "emailVerified" from "user"'))[0]
    ).toMatchObject({
      email: EMAIL,
      emailVerified: true,
    })
  })
)
```

## Mobile

Unit tests only (`*.test.ts`) for the pure logic in `src/` (phone and contact parsing, the login flow state, profile and alert helpers). `src/dependency-graph.test.ts` also fails on import cycles: Metro initializes a cycle in an order that leaves some import `undefined` at startup. Nothing renders React Native components, so no simulator or Postgres is needed and the whole project runs in well under a second.

## Types

In `packages/*` and `apps/mobile`, `tsconfig.json` excludes the tests and `tsconfig.test.json` includes them with the Bun types. `bun run typecheck` checks both, so code that also runs in React Native can't use `Bun.*` without failing the typecheck.
