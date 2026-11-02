# API contracts (`packages/contracts`)

The contract is the only thing the server and the apps share. Old app versions stay installed for months and can't be forced to update, so **every change is reviewed as if those versions were still calling us**.

## Layers

- `contracts` depends only on `effect`. It never imports server or app code.
- `api-client` depends only on `contracts`.
- Workspace packages are imported by name (`@vornway/contracts/...`), never by relative path (enforced by lint).
- `effect` is a peer dependency of both packages, and the server and the apps consume them `injected`, so there is a single copy of `effect` at runtime. With two copies, Schema checks fail across them. CI runs `scripts/check-single-effect.ts` in every project.

## Evolving responses without breaking old apps

- **Enums the server may extend** (statuses, kinds, levels) use `literalsWithFallback([...], 'unknown')`. An app that doesn't know a new value decodes it as `'unknown'` instead of failing the whole response. The server never sends `'unknown'` (encoding it fails).
- Closed `Schema.Literals` are only for values the server will never extend, and for requests.
- **Adding** an optional response field is safe; old apps ignore it.
- **Removing or renaming** a field, or making an optional one required, is a breaking change: add the new field, keep the old one until no supported app version reads it.
- New statuses on an endpoint, or route changes, show up in `api.test.ts`. Update it on purpose, never to make it pass.

## Lists

Every list endpoint is paginated with a cursor. A bare array response fails `api.test.ts`.

```ts
HttpApiEndpoint.get('list', '/api/vehicles', {
  query: PageQuery, // { cursor?, limit? (1..100, default 20) }
  success: Page(Vehicle), // { data: Vehicle[], nextCursor: Cursor | null }
  error: InvalidCursor, // 400: unknown or expired cursor
})
```

- A list that is small and bounded by nature may return everything at once. `GET /api/payment-methods` does (`PaymentMethodList`): a person links a handful of payment methods and the screen shows them all together. So do the registration form catalogs (product types, franchises and expiry years): a few closed values the form needs whole. A list that can grow without limit is never an exception.
- The cursor is opaque: clients pass back `nextCursor` as-is and stop when it's `null`.
- On the server, `paginate(items, idOf, query)` (`infrastructure/http/pagination.ts`) slices an ordered list.
- In the app, `api.<group>.<list>.infiniteQueryOptions()` feeds `useInfiniteQuery`. It only exists on paginated endpoints.

## Errors every endpoint can return

| Status | Body                               | When                                              |
| ------ | ---------------------------------- | ------------------------------------------------- |
| 400    | `InvalidRequest { message, kind }` | Params, query or payload don't match the schema   |
| 500    | `InternalError { traceId }`        | Unexpected failure; search the logs for `traceId` |

Plus whatever each endpoint declares.
