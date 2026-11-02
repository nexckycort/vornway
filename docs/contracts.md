# API contracts (`packages/contracts`)

The contract is the only thing the server and the apps share. Old app versions stay installed for months and can't be forced to update, so **every change is reviewed as if those versions were still calling us**.

## Layers

- `contracts` depends only on `effect`. It never imports server or app code.
- `api-client` depends only on `contracts`.
- Workspace packages are imported by name (`@vornway/contracts/...`), never by relative path.
- `effect` is a peer dependency of both packages, and the server and the apps consume them `injected` (`dependenciesMeta`), so there is a single copy of `effect` at runtime. With two copies, Schema checks fail across them (a transform from one copy crashes in the other). `bun run check:effect` runs `scripts/check-single-effect.ts` in a project.
- An injected package is a hard-linked copy: edits to existing contract files show up at once, but a **new file** needs `bun run sync:contracts` in the consumer (`apps/api`, `packages/api-client`). After a `git stash`/`checkout` run it too.
- Contract modules are exported with a wildcard (`@vornway/contracts/modules/<feature>/contract`): adding one needs no `package.json` edit.

## Evolving responses without breaking old apps

- **Enums the server may extend** (statuses, kinds, levels) use `literalsWithFallback([...], 'unknown')`. An app that doesn't know a new value decodes it as `'unknown'` instead of failing the whole response. The server never sends `'unknown'` (encoding it fails).
- Closed `Schema.Literals` are only for values the server will never extend, and for requests.
- **Adding** an optional response field is safe; old apps ignore it.
- **Removing or renaming** a field, or making an optional one required, is a breaking change: add the new field, keep the old one until no supported app version reads it.
- New statuses on an endpoint, or route changes, show up in `api.test.ts`. Update it on purpose, never to make it pass.

## Lists

Every list endpoint is paginated with a cursor. A bare array response fails `api.test.ts`.

```ts
HttpApiEndpoint.get('list', '/api/groups', {
  query: PageQuery, // { cursor?, limit? (1..100, default 20) }
  success: Page(Group), // { data: Group[], pagination: { limit, total, nextCursor } }
})
```

- A list that is small and bounded by nature may return everything at once, wrapped in an object (`GET /api/users/search` answers `{ data }` with at most five users). A list that can grow without limit is never an exception.
- The cursor is opaque: clients pass back `nextCursor` as-is and stop when it's `null`. The Prisma helper's cursor is a row id, and an unknown id just yields an empty page; `InvalidCursor` (400) is for endpoints whose cursor can be malformed.
- On the server, `pageArgs` and `toPage` (`src/infrastructure/database/pagination.ts`) adapt Prisma cursor queries to the shared response shape: take `limit + 1`, `cursor` plus `skip: 1` when a cursor is given, order by `createdAt desc, id desc`, default limit 20. The cursor is the id of the last row, as the old routes returned it. Keep `pagination.limit`, `pagination.total`, and `pagination.nextCursor` because existing webapp callers read `pagination.total`.
- In the app, `api.<group>.<list>.infiniteQueryOptions()` feeds `useInfiniteQuery`. It only exists on endpoints whose response has `pagination.nextCursor`.
- Error bodies keep the `code`/`message` (or `error`) fields the apps already read, next to `_tag`: installed apps show `message` to the user.
- Public endpoints (no `SessionAuth`, like `login`) are in the contract too; protocol endpoints with HTML, redirects or form bodies (OAuth, MCP, media, Better Auth) are not.

## Errors every endpoint can return

| Status | Body                               | When                                              |
| ------ | ---------------------------------- | ------------------------------------------------- |
| 400    | `InvalidRequest { message, kind }` | Params, query or payload don't match the schema   |
| 500    | `InternalError { traceId }`        | Unexpected failure; search the logs for `traceId` |

Plus whatever each endpoint declares.
