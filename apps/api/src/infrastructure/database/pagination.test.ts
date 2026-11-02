import { describe, expect, it } from 'bun:test';
import { Cursor } from '@vornway/contracts/schema';
import { pageArgs, toPage } from './pagination';

describe('pageArgs', () => {
  it('takes one row more than the limit and defaults to 20', () => {
    expect(pageArgs({})).toEqual({
      limit: 20,
      args: {
        take: 21,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      },
    });
  });

  it('skips the cursor row itself', () => {
    expect(pageArgs({ limit: 5, cursor: Cursor.make('row-5') }).args).toEqual({
      take: 6,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      cursor: { id: Cursor.make('row-5') },
      skip: 1,
    });
  });
});

describe('toPage', () => {
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({ id: `row-${index + 1}` }));

  it('points at the last returned row when more remain', () => {
    expect(toPage(rows(4), 3, 10)).toEqual({
      data: rows(3),
      pagination: { limit: 3, total: 10, nextCursor: 'row-3' },
    });
  });

  it('ends the list when the extra row is missing', () => {
    expect(toPage(rows(3), 3, 3).pagination.nextCursor).toBeNull();
    expect(toPage([], 3, 0)).toEqual({
      data: [],
      pagination: { limit: 3, total: 0, nextCursor: null },
    });
  });
});
