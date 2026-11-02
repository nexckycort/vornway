# Vornway API

Vornway HTTP backend: Effect (`effect/http-api`, Bun), Better Auth and Prisma/Postgres. Every route is served by the Effect router in `src/app.ts`.

## Commands

```sh
docker compose up -d postgres   # from the repo root: Postgres on 127.0.0.1:5433
bun install
bun run dev
bun check
bun typecheck
bun run test
bun run sync:contracts          # after adding files to packages/contracts
bun run check:effect            # one copy of effect across the workspace
```

`bun check`, `bun typecheck` and `bun run test` must pass before a change is considered done.

`PORT` (default 3000) and `HOST` (default `0.0.0.0`) choose where `src/main.ts` listens; the other variables are in `.env.example`. `bun build.ts` compiles the server to `dist/api`, which is what the `Dockerfile` ships.

Push notifications require `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`. `MCP_TOKEN_SECRET` signs the MCP access tokens (it falls back to `BETTER_AUTH_SECRET`) and `MCP_OAUTH_CLIENTS` is an optional JSON list of preregistered OAuth clients.

## Architecture

```text
src/
├── main.ts               # BunHttpServer + AppRoutes
├── app.ts                # the only place layers are wired
├── config/env.ts         # Effect Config for every variable
├── modules/<feature>/    # http.ts (HttpApi handlers) or routes.ts (raw routes), service.ts, tests
└── infrastructure/       # database, auth, email, storage, push, notifications, http edge
```

The contract lives in `packages/contracts` and is shared with the apps through `packages/api-client`. Read `docs/effect-services.md`, `docs/contracts.md`, `docs/testing.md` and `docs/adding-a-module.md` (at the repo root) before changing the server.

## What it serves

- The typed JSON API of `packages/contracts` under `/api/*`, with its OpenAPI document at `/openapi.json` and the Scalar docs at `/docs`.
- Better Auth under `/api/auth/*`.
- The public login routes under `/api/login/*` (also in the contract), including the MCP token exchange.
- `/api/media/groups/*`: group files from the bucket, publicly cached.
- The OAuth 2.0 flow for MCP clients (`/oauth/register`, `/oauth/authorize`, `/oauth/token`) and its discovery documents under `/.well-known/*`.
- `/mcp`: the MCP Streamable HTTP endpoint, authenticated with the bearer token those flows issue.
- `/` (health) and `/version`.
