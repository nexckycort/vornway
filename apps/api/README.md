# Vornway API

Vornway HTTP/RPC backend. The application stack is Hono, Zod, and Prisma.

## Commands

```sh
bun install
bun run dev
bun check
bun typecheck
bun test
bun build:rpc
```

`bun check` and `bun typecheck` must pass before a change is considered done.

## Architecture

The API is organized by vertical capabilities under `src/routes`.

```text
src/
├── app/                  # Hono composition, MCP, error handler
├── infrastructure/       # DB, auth, email, storage, push, notifications
├── routes/
│   ├── authed/           # session-protected routes
│   ├── public/           # public routes
│   └── mcp/              # MCP tools and context
└── shared/               # cross-cutting types/errors/middlewares
```

There is no `src/modules`. Do not create `service.ts` or `repository.ts` by default.

Conventions:

- `*.routes.ts`: Hono HTTP boundary.
- `*.validators.ts` or `schema.ts`: Zod contracts.
- `*.query.ts`: one concrete read operation.
- `*.command.ts`: one concrete write operation.
- `*.operations.ts`: temporary grouping only when splitting further would reduce clarity.
- `*.storage.ts`: storage adapter owned by one resource.
- `*.errors.ts`: typed module errors.

If an integration is shared by multiple modules, it belongs in `src/infrastructure`.
Current examples: DB, shared images, push delivery, and notifications inbox.

## Error contract

Routes that keep the legacy contract respond with:

```json
{ "error": "Visible message" }
```

The global typed-error handler uses:

```json
{ "code": "ERROR_CODE", "message": "Visible message" }
```

Do not compare `error.message` in routes to choose an HTTP status. Operations
must throw `AppError` or module-specific typed errors with `code` and `status`.

## RPC

Each route module exports its RPC type:

```ts
export type UsersRpc = typeof usersRoutes;
```

After changing routes or contracts:

```sh
bun build:rpc
```

If the frontend uses the affected contract, also run:

```sh
cd ../webapp
bun typecheck
```

## Environment variables

Push notifications require:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
