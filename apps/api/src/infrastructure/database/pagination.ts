import { Cursor, type PageQuery } from '@vornway/contracts/schema';

const DEFAULT_LIMIT = 20;

export const pageArgs = (query: PageQuery) => {
  const limit = query.limit ?? DEFAULT_LIMIT;
  return {
    limit,
    args: {
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
      ...(query.cursor === undefined
        ? {}
        : { cursor: { id: query.cursor }, skip: 1 }),
    },
  };
};

export const toPage = <Row extends { readonly id: string }>(
  rows: readonly Row[],
  limit: number,
  total: number,
) => {
  const data = rows.slice(0, limit);
  const last = data.at(-1);
  return {
    data,
    pagination: {
      limit,
      total,
      nextCursor: rows.length > limit && last ? Cursor.make(last.id) : null,
    },
  };
};
