# Adding an API module

`users` is the template: copy its shape, don't invent a new one. Read `docs/effect-services.md`, `docs/contracts.md` and `docs/testing.md` first.

| Piece             | Users file                                             |
| ----------------- | ------------------------------------------------------ |
| Contract          | `packages/contracts/src/modules/users/contract.ts`     |
| Domain service    | `apps/api/src/modules/users/service.ts`                |
| Handlers          | `apps/api/src/modules/users/http.ts`                   |
| Integration tests | `apps/api/src/modules/users/users.integration.test.ts` |

## Checklist

1. **Decide the surface**. Paths, methods, payloads, success bodies and error bodies are a promise to every installed app version: see `docs/contracts.md`. Errors carry the `{ code, message }` or `{ error }` fields the apps show to the user next to `_tag` (see `UsernameAlreadyTaken`, `Forbidden`), with `Schema.withConstructorDefault` so `new UserNotFound()` needs no arguments.
2. **Contract**: create `packages/contracts/src/modules/<feature>/contract.ts` with `HttpApiGroup.make('<feature>')`, the endpoints, and `.middleware(SessionAuth)` at the end of the chain (`AdminOnly` instead for admin routes; leave it off for public endpoints such as `login`). Trimmed strings are `TrimmedString` from `@vornway/contracts/schema`; lists use `PageQuery` and `Page(Item)`.
3. **Register it**: add `.add(<Feature>Api)` to `packages/contracts/src/api.ts` (keep the list alphabetical) and export its public schemas from `packages/contracts/src/index.ts`. No `package.json` edit: `./modules/*` is a wildcard export.
4. **Add the new files to the apps**: `bun run sync:contracts` in `apps/api` (and `packages/api-client` if you touched it). Contracts are consumed `injected`, so a new file isn't visible until then; edits to existing files are.
5. **Service** `apps/api/src/modules/<feature>/service.ts`: `Context.Service` plus `static readonly layer`, every method `Effect.fn('<Feature>.method')`. Dependencies are `yield*`ed (`Database`, `Storage`, `Push`, `NotificationInbox`, `Email`, `HttpClient`), never imported as singletons. Persistence is `database.use((db) => db.x...)`; expected failures are the contract's tagged errors.
6. **Handlers** `apps/api/src/modules/<feature>/http.ts`: `HttpApiBuilder.group(Api, '<feature>', ...)` with thin handlers (`Effect.flatMap(CurrentUser, (user) => service.method(user.id, ...))`) and `.pipe(Layer.provide(<Feature>.layer))`.
7. **Wire it**: add `<Feature>Handlers` to the handler list in `apps/api/src/app.ts` (alphabetical). Nothing else in `app.ts` changes.
8. **Tests** `<feature>.integration.test.ts` next to the service, with `apps/api/testkit/`:
   - every resource owned by a user: an isolation test (user B can't read or change what user A owns);
   - every paginated list: a pagination test (`limit`, `nextCursor`, `total`, follow the cursor to the end);
   - the error bodies, the validation 400s and the 401 without session;
   - anything that leaves the server (storage, push, email, outbound HTTP) goes through the testkit fakes, never a hand-built layer.
9. **Contract tests**: update the surface in `packages/contracts/src/api.test.ts` on purpose (one line per endpoint with its statuses).
10. **Finish**: `bun lint:fix`, `bun fmt:fix`, `bun typecheck` and `bun run test` in `apps/api` and `packages/contracts` (plus `packages/api-client` if touched).

## Routes outside the contract

Endpoints that aren't a typed JSON API stay out of `packages/contracts`: Better Auth (`/api/auth/*`), the OAuth flow with its HTML page and form posts (`/oauth/*`, `/.well-known/*`), the MCP transport (`/mcp`) and public file serving (`/api/media/*`). They are raw `HttpRouter` routes:

- `modules/<feature>/routes.ts` exports `HttpRouter.use((router) => ...)` layers that `yield*` their services and call `router.add(method, path, handler)`; the services they need are provided in the same file.
- Decode input once at the edge with `HttpServerRequest.schemaBodyJson`, `schemaBodyUrlParams` or `schemaSearchParams` and answer schema failures with a 400.
- Add the layer to `AppRoutesNoDeps` in `apps/api/src/app.ts`.
- Test through `app.fetch(path, init)`, which returns the raw `Response`.

## Details worth copying from `users`

- **Database failures**: `database.use` and `database.transaction` fail with `InternalError { traceId }` (500, logged). When a Prisma error code is part of the behavior, use `database.attempt` and branch on `DatabaseError.isUniqueViolation` / `isNotFound` (`Users.updateUsername`), sending anything else to `database.internal(error)`.
- **Decisions inside a transaction**: return a value from the callback and fail outside it (`Users.updateImage` returns `null` and then fails `UserNotFound`), because the callback is a Promise.
- **Best-effort side effects** (deleting the old image) use `Effect.ignore({ log: true })`.
- **Resources that must be undone when a later step fails** use `Effect.acquireRelease` inside `Effect.scoped` (`Feedback.create` deletes the uploaded images if the insert fails).
- **Pagination**: `pageArgs(query)` gives the Prisma arguments (`take: limit + 1`, cursor with `skip: 1`, `createdAt desc, id desc`) and `toPage(rows, limit, total)` the `{ data, pagination }` response with a branded `Cursor`. The cursor is the row id.
- **Pure URL helpers** (`resolveUserImageUrl`, `resolveAssetUrl`, `storageKey`) live in `infrastructure/storage/image-urls.ts`.
