# Effect services (server)

How server code is shaped. Read `.repos/effect/LLMS.md` first for the Effect APIs themselves, and `docs/adding-a-module.md` for the step-by-step.

## Layout

- `src/modules/<feature>/`: one folder per feature.
  - `http.ts`: the `HttpApiBuilder.group` handlers.
  - `routes.ts`: raw `HttpRouter` routes for what isn't a typed JSON API (`oauth`, `mcp`, `media`).
  - `service.ts`: the domain service.
  - Other files only when they earn their place (`views.ts`, `alerts.ts`, …).
- `src/infrastructure/`: what several features share to talk to the outside world, plus the HTTP edge.
  - `database/`: `DatabaseClient` (the Prisma client, closed with the scope), `Database` (the effectful wrapper features use) and `pagination.ts`.
  - `auth/`: Better Auth (`Auth`, built by `makeAuth` in `better-auth.config.ts`), the raw `/api/auth/*` routes and the `SessionAuth`/`AdminOnly` middlewares.
  - `email/`, `storage/`, `push/`, `notifications/`: one `Context.Service` each (`Email`, `Storage`, `Push`, `NotificationInbox`) with a live layer and a fake in `testkit/`. `Storage` owns every bucket operation (user and group images, expense attachments, feedback images, `getObject` for the media route).
  - `http/`: the edge (errors, CORS, secure headers, request id, health).
- `src/config/env.ts`: every environment variable as an Effect `Config`. Application code reads `Config`, never `process.env` (the only exception is `APP_VERSION`, which `build.ts` replaces at compile time).
- `src/app.ts`: the only place layers get wired together. Adding a module is one line in its handler list; `FetchHttpClient` is provided there once for everyone.

## Handlers stay thin

A handler reads `CurrentUser`, calls **one** service method and returns its result:

```ts
.handle('username', ({ payload }) =>
  Effect.flatMap(CurrentUser, (user) => users.updateUsername(user.id, payload.username))
)
```

No business rules, no persistence, no error mapping beyond what the contract declares.

## Services

- `Context.Service` with the interface inline, plus a `static readonly layer`. Dependencies come from the environment (`yield* Database`), never from imports of other layers.
- Every service method is `Effect.fn('Service.method')`. That name is the span name in traces, so a method without it doesn't show up.
- A feature reaches Postgres only through `Database`: `database.use((db) => db.user.findMany(...))` and `database.transaction((tx) => ...)`. Both fail with `InternalError`, so a service doesn't have to map database failures.
- Wrap what you don't control behind a service (`Storage`, `Push`, `Email`) so tests swap it: the testkit provides a fake for each, and for `HttpClient`.

## Errors

- **Expected failures**: a `Schema.TaggedError` declared in the contract with its `httpApiStatus`. Raise it from the service (`return yield* new UserNotFound()`).
- **Failures of infrastructure we call**: a `Data.TaggedError` local to that client (`EmailError`, `StorageError`, `PushError`, `NotificationInboxError`, `DatabaseError`). Map it to a contract error where it reaches a handler (`Users.updateImage` turns a `StorageError` into `UserImageRejected`).
- **Prisma error codes** that are part of the behavior (unique violation, record not found): `database.attempt(...)` fails with `DatabaseError`, which has `isUniqueViolation` and `isNotFound`; send everything else to `database.internal(error)`.
- **Never `Effect.die` / `orDie`** outside tests. A defect becomes an opaque `InternalError { traceId }` (500) and the cause only reaches the logs. Not lint-enforced yet: review for it.
- Catch by tag (`Effect.catchTag`/`catchTags`), not with a catch-all, so new errors aren't swallowed by accident.

## The HTTP edge (`src/infrastructure/http/`)

Two middlewares apply to the whole API (declared in `packages/contracts/src/api.ts`):

- `RequestValidation`: any schema failure (params, query, payload) becomes `InvalidRequest { message, kind }` (400) and logs a warning.
- `ErrorBoundary`: any defect is recorded by `ErrorCapture` (logs today; Sentry later) and answered with `InternalError { traceId }` (500).

Around the API, `app.ts` also serves `/` and `/version`, `/docs` (Scalar) and `/openapi.json`, `/api/auth/*` (Better Auth), `/api/media/groups/*`, the OAuth endpoints and discovery documents, `/mcp`, CORS with credentials, secure headers and `x-request-id`. Anything else is a plain 404.

## Auth

- `SessionAuth` (contract: `modules/auth/contract.ts`) verifies the Better Auth session from the request headers (cookies, `expo-origin`) and provides `CurrentUser { id, name, email }`. Missing session: `Unauthorized` (401); Better Auth failing: `AuthUnavailable` (503). Renewed session cookies are forwarded to the response.
- `AdminOnly` does the same and then requires an address in `infrastructure/auth/admin-emails.ts` (`Forbidden`, 403). Use it instead of `SessionAuth` for admin groups.

## Outbound HTTP

Use `HttpClient` from `effect/http`: typed errors, timeouts and spans. Don't call `fetch` in server code. `app.ts` provides `FetchHttpClient` once; services `yield* HttpClient.HttpClient` and tests replace it with `makeTestApp({ http })` (see `docs/testing.md`).
