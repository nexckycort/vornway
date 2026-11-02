# Porting an API module

`users` is the template: copy its shape, don't invent a new one. Read `docs/effect-services.md`, `docs/contracts.md` and `docs/testing.md` first.

| Piece                      | Users file                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| Contract                   | `packages/contracts/src/modules/users/contract.ts`                                            |
| Domain service             | `apps/api/src/modules/users/service.ts`                                                       |
| Handlers                   | `apps/api/src/modules/users/http.ts`                                                          |
| Integration tests          | `apps/api/src/modules/users/users.integration.test.ts`                                        |
| Old Hono routes (the spec) | `apps/api/src/routes/authed/users/*` (kept unmounted: only `src/hc/users.ts` types use them) |

## Checklist

1. **Read the old routes** (`apps/api/src/routes/authed/<feature>/*`). Paths, methods, payloads, success bodies and error bodies must stay identical: installed apps keep calling them. Old errors answered `{ code, message }` or `{ error }`; declare the same fields on the contract error (see `UsernameAlreadyTaken`, `Forbidden`) next to `_tag`, with `Schema.withConstructorDefault` so `new UserNotFound()` needs no arguments.
2. **Contract**: create `packages/contracts/src/modules/<feature>/contract.ts` with `HttpApiGroup.make('<feature>')`, the endpoints, and `.middleware(SessionAuth)` at the end of the chain (`AdminOnly` instead for admin routes). Zod's `.trim()` is `TrimmedString` from `@vornway/contracts/schema`; lists use `PageQuery` and `Page(Item)`.
3. **Register it**: add `.add(<Feature>Api)` to `packages/contracts/src/api.ts` (keep the list alphabetical) and export its public schemas from `packages/contracts/src/index.ts`. No `package.json` edit: `./modules/*` is a wildcard export.
4. **Add the new files to the apps**: `bun run sync:contracts` in `apps/api` (and `packages/api-client` if you touched it). Contracts are consumed `injected`, so a new file isn't visible until then; edits to existing files are.
5. **Service** `apps/api/src/modules/<feature>/service.ts`: `Context.Service` plus `static readonly layer`, every method `Effect.fn('<Feature>.method')`. Dependencies are `yield*`ed (`Database`, `Storage`, `Push`, `NotificationInbox`, `Email`). Move the old `*.query.ts`/`*.command.ts` logic in, replacing `db.x` with `database.use((db) => db.x...)` and thrown `AppError`s with the contract's tagged errors. Don't import `#/infrastructure/database/connection` or the singletons in `infrastructure/{push,notifications,storage}/*`: that's the legacy path.
6. **Handlers** `apps/api/src/modules/<feature>/http.ts`: `HttpApiBuilder.group(Api, '<feature>', ...)` with thin handlers (`Effect.flatMap(CurrentUser, (user) => service.method(user.id, ...))`) and `.pipe(Layer.provide(<Feature>.layer))`.
7. **Wire it**: add `<Feature>Handlers` to the handler list in `apps/api/src/app.ts` (alphabetical). Nothing else in `app.ts` changes.
8. **Retire the Hono route**: delete the `.route('/<feature>', ...)` line (and its import) from `apps/api/src/routes/authed/routes.ts`. HttpApi routes always win over the Hono fallback, but the old handlers would be dead code. `src/hc/<feature>.ts` stays until the webapp and mobile stop importing `@vornway/api/hc/<feature>`; while it does, keep the old route files it needs for types and delete the rest. Delete the folder once nothing imports it.
9. **Tests** `<feature>.integration.test.ts` next to the service, with `apps/api/testkit/`:
   - every resource owned by a user: an isolation test (user B can't read or change what user A owns);
   - every paginated list: a pagination test (`limit`, `nextCursor`, `total`, follow the cursor to the end);
   - the old error bodies, the validation 400s and the 401 without session.
10. **Contract tests**: update the surface in `packages/contracts/src/api.test.ts` on purpose (one line per endpoint with its statuses).
11. **Finish**: `bun check`, `bun typecheck` and `bun run test` in `apps/api` and `packages/contracts` (plus `packages/api-client` if touched). Run `bun run check:effect` in `apps/api` if you changed dependencies.

## Details worth copying from `users`

- **Database failures**: `database.use` and `database.transaction` fail with `InternalError { traceId }` (500, logged). When a Prisma error code is part of the behavior, use `database.attempt` and branch on `DatabaseError.isUniqueViolation` / `isNotFound` (`Users.updateUsername`), sending anything else to `database.internal(error)`.
- **Decisions inside a transaction**: return a value from the callback and fail outside it (`Users.updateImage` returns `null` and then fails `UserNotFound`), because the callback is a Promise.
- **Best-effort side effects** (deleting the old image) use `Effect.ignore({ log: true })`.
- **Pagination**: `pageArgs(query)` gives the Prisma arguments (`take: limit + 1`, cursor with `skip: 1`, `createdAt desc, id desc`) and `toPage(rows, limit, total)` the `{ data, pagination }` response. The cursor is the row id, as the old routes had it.
- **Pure URL helpers** (`resolveUserImageUrl`, `getVersionedGroupImageUrl`) live in `infrastructure/storage/image-urls.ts`; import them from there, not from the files that talk to R2.
