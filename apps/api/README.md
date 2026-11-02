# Vornway API

Vornway HTTP backend. The stack is Effect (`effect/http-api`, Bun), Better Auth and Prisma/Postgres, being migrated from Hono + Zod: modules not yet ported are still served by the legacy Hono app behind a fallback route.

## Commands

```sh
docker compose up -d postgres   # from the repo root: Postgres on 127.0.0.1:5433
bun install
bun run dev
bun check
bun typecheck
bun run test
bun build:rpc                   # declarations of the legacy `hc` clients
bun run sync:contracts          # after adding files to packages/contracts
bun run check:effect            # one copy of effect across the workspace
```

`bun check`, `bun typecheck` and `bun run test` must pass before a change is considered done.

`PORT` (default 3000) and `HOST` (default `0.0.0.0`) choose where `src/main.ts` listens; the other variables are in `.env.example`.

## Architecture

```text
src/
├── main.ts               # BunHttpServer + AppRoutes
├── app.ts                # the only place layers are wired
├── config/env.ts         # Effect Config for every variable
├── modules/<feature>/    # ported features: http.ts, service.ts, tests
├── infrastructure/       # database, auth, email, storage, push, notifications, http edge
└── routes, app, shared   # legacy Hono code, shrinking as modules are ported
```

The contract lives in `packages/contracts` and is shared with the apps through `packages/api-client`. Read `docs/effect-services.md`, `docs/contracts.md`, `docs/testing.md` and `docs/porting-a-module.md` (at the repo root) before changing the server.

## Legacy Hono code

Everything under `src/routes`, `src/app`, `src/shared` and `src/config/legacy-env.ts` is the old Hono/Zod implementation. It keeps answering the routes that have no Effect handler yet (`src/infrastructure/http/legacy.ts` mounts it last, so it never shadows a ported route), and `src/hc/*` still exports its RPC types for the webapp and mobile clients. Don't add features there: port the module instead.

Push notifications require `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`.
