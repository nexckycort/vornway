import type { GroupListItem } from '@vornway/contracts/modules/groups/schemas';
import type { PageQuery } from '@vornway/contracts/schema';
import { Effect } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { pageArgs, toPage } from '#/infrastructure/database/pagination';
import { visibleGroup } from './helpers';
import {
  type CurrentUserIdentity,
  type GroupListFilter,
  groupListSelect,
  matchesFilter,
  toGroupListItem,
} from './list-view';

export type ListQuery = PageQuery & {
  readonly search?: string;
  readonly filter?: GroupListFilter;
};

const BATCH_SIZE = 100;

export const makeGroupLister = Effect.gen(function* () {
  const database = yield* Database;

  const fetchListRows = (
    userId: string,
    search: string | undefined,
    cursor: string | undefined,
    take: number,
  ) =>
    database.use((db) =>
      db.group.findMany({
        where: listWhere(userId, search),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: groupListSelect,
      }),
    );

  const collectFiltered = Effect.fn('Groups.collectFiltered')(function* (
    userId: string,
    currentUser: CurrentUserIdentity,
    query: ListQuery,
    filter: GroupListFilter,
    want: number,
  ) {
    const collected: (typeof GroupListItem.Type)[] = [];
    let cursor: string | undefined = query.cursor;
    while (collected.length < want) {
      const rows = yield* fetchListRows(
        userId,
        query.search,
        cursor,
        BATCH_SIZE,
      );
      for (const row of rows) {
        const group = toGroupListItem(row, userId, currentUser);
        if (!matchesFilter(group, filter)) continue;
        collected.push(group);
        if (collected.length === want) break;
      }
      if (rows.length < BATCH_SIZE) break;
      cursor = rows[rows.length - 1]?.id;
    }
    return collected;
  });

  const countFiltered = Effect.fn('Groups.countFiltered')(function* (
    userId: string,
    currentUser: CurrentUserIdentity,
    search: string | undefined,
    filter: GroupListFilter,
  ) {
    let total = 0;
    let cursor: string | undefined;
    while (true) {
      const rows = yield* fetchListRows(userId, search, cursor, BATCH_SIZE);
      total += rows.filter((row) =>
        matchesFilter(toGroupListItem(row, userId, currentUser), filter),
      ).length;
      if (rows.length < BATCH_SIZE) return total;
      cursor = rows[rows.length - 1]?.id;
    }
  });

  const list = Effect.fn('Groups.list')(function* (
    userId: string,
    query: ListQuery,
  ) {
    const filter = query.filter ?? 'all';
    const { limit, args } = pageArgs(query);
    const currentUser = yield* database.use((db) =>
      db.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, updatedAt: true },
      }),
    );

    if (filter === 'all') {
      const [total, rows] = yield* Effect.all(
        [
          database.use((db) =>
            db.group.count({ where: listWhere(userId, query.search) }),
          ),
          database.use((db) =>
            db.group.findMany({
              ...args,
              where: listWhere(userId, query.search),
              select: groupListSelect,
            }),
          ),
        ],
        { concurrency: 2 },
      );
      return toPage(
        rows.map((row) => toGroupListItem(row, userId, currentUser)),
        limit,
        total,
      );
    }

    const [total, collected] = yield* Effect.all(
      [
        countFiltered(userId, currentUser, query.search, filter),
        collectFiltered(userId, currentUser, query, filter, limit + 1),
      ],
      { concurrency: 2 },
    );
    return toPage(collected, limit, total);
  });

  return list;
});

const listWhere = (userId: string, search: string | undefined) => ({
  ...visibleGroup(userId),
  ...(search
    ? { name: { contains: search, mode: 'insensitive' as const } }
    : {}),
});
