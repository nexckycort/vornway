import { db } from '~/infrastructure/database/connection';
import type { ListGroupsQuery } from './groups.validators';

type GroupListItem = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
  participantCount: number;
  totals: Record<string, number>;
  myMembership: {
    id: string;
    name: string;
    role: string;
  } | null;
};

type FindAllGroupsResponse = {
  data: GroupListItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

export class GroupsService {
  async findAll(
    userId: string,
    query: ListGroupsQuery,
  ): Promise<FindAllGroupsResponse> {
    const where = {
      GroupMember: {
        some: {
          userId,
        },
      },
    } as const;

    const [total, rows] = await Promise.all([
      db.group.count({ where }),
      db.group.findMany({
        where,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        take: query.limit + 1,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          inviteCode: true,
          createdAt: true,
          updatedAt: true,
          totals: true,
          GroupMember: {
            where: {
              userId,
            },
            select: {
              id: true,
              name: true,
              role: true,
            },
            take: 1,
          },
          _count: {
            select: {
              GroupMember: true,
            },
          },
        },
      }),
    ]);

    const hasNextPage = rows.length > query.limit;
    const pageRows = hasNextPage ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasNextPage
      ? pageRows[pageRows.length - 1]?.id ?? null
      : null;

    const data: GroupListItem[] = pageRows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.description,
      inviteCode: row.inviteCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      participantCount: row._count.GroupMember,
      totals: (row.totals as Record<string, number>) ?? {},
      myMembership: row.GroupMember[0]
        ? {
            id: row.GroupMember[0].id,
            name: row.GroupMember[0].name,
            role: row.GroupMember[0].role,
          }
        : null,
    }));

    return {
      data,
      pagination: {
        limit: query.limit,
        total,
        nextCursor,
      },
    };
  }
}
