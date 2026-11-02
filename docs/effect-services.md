# Effect services (server)

How server code is shaped. Read `.repos/effect/LLMS.md` first for the Effect APIs themselves.

## Layout

- `src/modules/<feature>/`: one folder per feature.
  - `http.ts`: the `HttpApiBuilder.group` handlers.
  - `service.ts`: the domain service.
  - `legacy.ts` (or `legacy/` for several): a client for external endpoints only this feature calls.
  - Other files only when they earn their place (`store.ts`, `alerts.ts`, …).
- `src/infrastructure/`: what several features share to talk to the outside world (database, auth, email, SMS, the provider clients, envelope and paging) plus the HTTP edge (`http/`).
- `src/app.ts`: the only place layers get wired together.

## Handlers stay thin

A handler reads `CurrentUser`, calls **one** service method and returns its result:

```ts
.handle('get', ({ params }) =>
  Effect.flatMap(CurrentUser, (user) => vehicles.get(user.id, params.id))
)
```

No business rules, no persistence, no error mapping beyond what the contract declares.

## Services

- `Context.Service` with the interface inline, plus a `static readonly layer`. Dependencies come from the environment (`yield* VehicleStore`), never from imports of other layers.
- Every service method is `Effect.fn('Service.method')`. That name is the span name in traces, so a method without it doesn't show up.
- Wrap storage behind its own service (`VehicleStore`) so it can be swapped (memory → Postgres) without touching the domain service.

## Errors

- **Expected failures:** a `Schema.TaggedError` declared in the contract with its `httpApiStatus`. Raise it from the service (`return yield* new VehicleNotFound()`).
- **Failures of infrastructure we call:** a `Data.TaggedError` local to that client (`EmailError`, `SmsError`). Map it to a contract error where it reaches a handler.
- **Never `Effect.die` / `orDie`** outside tests (enforced by lint). A defect becomes an opaque `InternalError { traceId }` (500), and the cause only reaches the logs.
- Catch by tag (`Effect.catchTag`/`catchTags`), not with a catch-all, so new errors aren't swallowed by accident.

## The HTTP edge (`src/infrastructure/http/`)

Two middlewares apply to the whole API (declared in `packages/contracts/src/api.ts`):

- `RequestValidation`: any schema failure (params, query, payload) becomes `InvalidRequest { message, kind }` (400) and logs a warning.
- `ErrorBoundary`: any defect is recorded by `ErrorCapture` (logs today; Sentry later) and answered with `InternalError { traceId }` (500).

## Outbound HTTP

Use `HttpClient` from `effect/http` (lint rejects `fetch` in the server). It gives typed errors, timeouts and spans.

## Observability

`infrastructure/observability/otlp.ts` exports traces, metrics and logs with Effect's own OTLP exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (`docker compose up -d observability` runs one locally, UI on port 3001).
