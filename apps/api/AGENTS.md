# AGENTS.md

Rules specific to `apps/api`.

## Module Standard

API route modules are organized by domain. The first local example is
`src/routes/authed/users`.

Each module must have:

- `schema.ts`: Zod schemas for requests/responses and inferred types with
  `z.infer`.
- `repository.ts`: DB access. Prisma queries and transaction operations live
  here.
- `service.ts`: business rules. Orchestrates repositories, applies permissions,
  and transforms data.
- `routes.ts`: Hono HTTP entrypoint. Validates with `zValidator`, reads
  `c.req.valid`, reads user/context data from Hono, and calls the service.

Do not add auxiliary files like `*.service.ts` for subdomains if the code can
live inside the main service or a clear module dependency. `user-image.service.ts`
exists because the migration is incomplete and must not be treated as a new
pattern.

## Dependencies

The correct direction is:

```txt
routes.ts -> service.ts -> repository.ts
schema.ts -> importable from routes/service when needed
```

- `routes.ts` must not write DB queries.
- `repository.ts` must not import `service.ts`.
- `service.ts` may use one or more repositories when that is a domain business
  rule.
- Service input types should come from `schema.ts` when they represent request
  data.

## Hono And RPC

Define routes with method chaining to preserve Hono type inference:

```ts
const users = new Hono<AppContext>()
  .get('/search', handler)
  .patch('/me/image', handler);

export default users;
export type UsersAppType = typeof users;
```

Avoid this pattern:

```ts
const users = new Hono<AppContext>();
users.get('/search', handler);
```

When a module is consumed from the frontend:

- Export `type <Module>AppType = typeof <module>` from `routes.ts`.
- Create `apps/api/src/hc/<module>.ts` with `create<Module>Client`.
- Export the client from `@vornway/api` if `package.json` needs it.
- In `apps/webapp`, create or update `src/api/<module>.ts` and consume the RPC
  client with `fetchWithCredentials`.

Current examples:

- API RPC: `apps/api/src/hc/users.ts`.
- Webapp client: `apps/webapp/src/api/users.ts`.

After changing RPC routes or types, run `bun run build:rpc` from `apps/api`.

## Prisma And Transactions

- Use `db` from `#/infrastructure/database/connection`.
- When the service opens a transaction, pass `tx` to the repository.
- Repository types should describe the DB-adjacent shape, not necessarily the
  exact request shape.
- If you change Prisma, add a migration when applicable and run
  `bun run db:generate`.

## Pagination

Every paginated list endpoint must use cursor-based pagination.

- Query params: `limit` and optional `cursor`.
- Response: `{ data, pagination: { limit, total, nextCursor } }`.
- Do not use `page`, `offset`, or `skip` as an offset strategy.
- Use `skip: 1` only with `cursor` to exclude the cursor row.

Response shape:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "total": 1234,
    "nextCursor": "ckxyz..."
  }
}
```

Prisma pattern:

```ts
const rows = await db.entity.findMany({
  where,
  ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  take: limit + 1,
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
});

const hasNextPage = rows.length > limit;
const data = hasNextPage ? rows.slice(0, limit) : rows;
const nextCursor = hasNextPage ? data.at(-1)?.id ?? null : null;
```

## Verification

- `bun run typecheck`
- `bun run build:rpc` if routes, schemas, or RPC-consumed types changed.
- `bun run test` when the module has tests or the change touches business rules.
