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
  transforms data, and returns Effect programs for IO-heavy operations.
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

## Effect Standard

New API code that performs IO should use Effect.

- Services should return `Effect.Effect<A, E, R>` for business operations with
  DB, network, storage, or other side effects.
- Routes should stay thin: validate input, read Hono context, call the service,
  and execute the returned Effect with `runHttpEffect`.
- Do not put ad-hoc `try/catch` response mapping in routes for expected domain
  failures.
- Use `Effect.gen` for multi-step workflows.
- Use `Effect.tryPromise` at Promise boundaries and map failures into typed
  domain errors.
- Add spans with `Effect.withSpan` for important business workflows.
- Use Effect requirements for infrastructure dependencies. The database context
  is `Database` from `#/infrastructure/database/context`, and the live layer is
  `DatabaseLive` from `#/infrastructure/database/layer`.
- Keep repositories simple and DB-focused. Services decide where to wrap
  repository or external calls in Effect.
- Repositories normally import and use `db` directly. Services should not pass
  `db` into repository methods; pass a database handle only when the service
  opens a transaction and needs the repository to use that `tx`.

HTTP execution pattern:

```ts
return runHttpEffect(
  c,
  userService.updateCurrentUserImage({
    userId,
    dataUrl,
  }),
);
```

Service pattern:

```ts
const program = Effect.gen(function* () {
  const db = yield* Database;

  const row = yield* Effect.tryPromise({
    try: () => db.user.findUnique({ where: { id: userId } }),
    catch: (cause) => new UserLookupError({ cause }),
  });

  return row;
}).pipe(Effect.withSpan('users.lookup'));
```

## Error Standard

Expected domain failures should be typed errors, not generic exceptions.

- Define module errors in `errors.ts`.
- Use `Data.TaggedError('<ErrorName>')`.
- Implement `ErrorMetadata<Status>` from `#/shared/errors/error-metadata`.
- Include stable `code`, user-safe `message`, and required HTTP `status`.
- Use literal statuses with `as const` when inference needs help.
- `runHttpEffect` accepts failures extending `ErrorMetadata` and converts them
  into typed HTTP JSON responses.

Example:

```ts
export class UserNotFoundError
  extends Data.TaggedError('UserNotFoundError')<{
    userId: string;
  }>
  implements ErrorMetadata<404>
{
  readonly code = 'USER_NOT_FOUND';
  readonly message = 'User not found';
  readonly status = 404 as const;
}
```

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
- Repository methods should use the module-level `db` by default. Do not pass
  `db` from services just to call ordinary repository methods.
- When the service opens a transaction, pass `tx` to the repository methods
  that must participate in that transaction.
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
