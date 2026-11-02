import { Cursor } from '@vornway/contracts/schema';
import { toPage } from '#/infrastructure/database/pagination';

export const toCursorPage = <Row extends { readonly id: string }>(
  rows: readonly Row[],
  limit: number,
  total: number,
) => {
  const page = toPage(rows, limit, total);
  return {
    ...page,
    pagination: {
      ...page.pagination,
      nextCursor:
        page.pagination.nextCursor === null
          ? null
          : Cursor.make(page.pagination.nextCursor),
    },
  };
};
