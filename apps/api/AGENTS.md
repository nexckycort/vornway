# API Agent Notes

## Pagination

Every paginated list endpoint must use cursor-based pagination.

- Query params: `limit` and optional `cursor`.
- Response shape: `{ data, pagination: { limit, total, nextCursor } }`.
- Do not use `page`, `offset`, or `skip` as an offset strategy.
- Use `skip: 1` only when `cursor` is present, to exclude the cursor row itself.
- Default `limit` should be `20`. Cap it server-side when needed.

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

Expected response:

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
