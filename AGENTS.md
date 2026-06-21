# AGENTS.md

Guidance for agents working in this monorepo.

## How To Use These Files

The standard file name is `AGENTS.md`. This root file applies to the whole
monorepo. If a subproject needs its own rules, add another `AGENTS.md` inside
that folder. The file closest to the code being edited supplements this file.

Current files:

- `AGENTS.md`: global monorepo rules.
- `apps/api/AGENTS.md`: API-specific rules for modules, services, and RPC.
- `apps/webapp/AGENTS.md`: main web app rules.

Add more files only when a subproject has real local rules, for example
`apps/join/AGENTS.md` if that flow needs its own guidance.

## Monorepo Map

- `apps/api`: Bun, Hono, Prisma API with generated RPC clients.
- `apps/webapp`: main authenticated app. Uses React, Rsbuild, TanStack Router,
  TanStack Query, and TanStack DB.
- `apps/join`: group invite and join flow.
- `apps/landing`: public landing app.
- `packages/ui`: shared components.

## General Rules

- Use `bun` to install dependencies, run scripts, and verify the project.
- Read existing code first and follow local patterns before introducing a new
  abstraction.
- Keep changes small and focused on the request.
- Do not revert changes you did not make. If the worktree is dirty, work around
  those changes.
- Use `rg` for text and file search.
- Use `apply_patch` for manual edits.
- Do not use destructive commands like `git reset --hard` or `git checkout --`
  without an explicit request.

## API

- The API lives in `apps/api`.
- Route modules must follow the domain module standard: `schema.ts`,
  `repository.ts`, `service.ts`, and `routes.ts`.
- Dependency direction is `routes -> service -> repository`. `schema.ts` can be
  imported by layers that need validation or types.
- `service.ts` contains business rules. `repository.ts` contains DB access.
  `routes.ts` only validates requests, reads user/context data, and calls
  services.
- New API business logic that performs IO must use Effect. Services should
  return `Effect.Effect<Success, DomainError, Requirements>` and routes should
  execute those effects through the shared HTTP runner instead of using ad-hoc
  `try/catch`.
- Public routes that must be exposed to RPC clients must keep the chained router
  style described in `apps/api/README.md`.
- Every module consumed by a client must export its Hono app type and have its
  own RPC client in `apps/api/src/hc/<module>.ts`.
- The webapp must consume that client through `apps/webapp/src/api/<module>.ts`.
- After changing routes or client-consumed types, run `bun run build:rpc` in
  `apps/api`.
- After changing Prisma, run `bun run db:generate` in `apps/api` and add a
  migration when applicable.
- Validate inputs with Zod and never trust client data for authorization.
- Model domain failures with `Data.TaggedError` classes that implement shared
  error metadata. Do not throw generic `Error` objects for expected API
  failures.
- Every paginated list endpoint must use cursor-based pagination with `limit`,
  optional `cursor`, and response shape `{ data, pagination: { limit, total,
  nextCursor } }`. Do not use `page`, `offset`, or `skip` as offset pagination.

## Webapp

- The main app lives in `apps/webapp`.
- For internal API calls, use RPC clients: `#/lib/hc` for the general client or
  `src/api/<module>.ts` when a module client exists. Do not use direct `fetch`
  against internal API endpoints.
- Follow TanStack Router conventions and keep generated routes up to date.
- Use TanStack Query and TanStack DB where cache, collection, or offline-first
  patterns already exist. Do not replace those flows with direct `localStorage`.
- Preserve the existing offline experience: expenses, groups, and sync must keep
  going through the existing queues and collections.
- Use `lucide-react` icons when an appropriate icon exists.

## Auth And Loading States

- Do not render a protected shell while auth state is unknown.
- When state is not verified, use neutral placeholders that are correct for any
  possible result.
- Login redirects must keep `returnTo` only if it is a same-origin relative path.
  Reject values like `//...` and API paths.
- Clear session hints or caches when logout happens or a verification contradicts
  local state.

## Verification

- API: from `apps/api`, use `bun run typecheck` for TypeScript changes.
- API RPC: from `apps/api`, use `bun run build:rpc` after changing routes or
  frontend-consumed contracts.
- Webapp: from `apps/webapp`, use `bun run typecheck` for TypeScript changes.
- Formatting: use the touched package's `bun run check` script when formatting
  or linting is needed.
