import { db } from '~/infrastructure/database/connection';
import type { GroupListItem, ListGroupsInput, ListGroupsResult } from './types';

export type GroupsService = {
  listGroups: (input: ListGroupsInput) => Promise<ListGroupsResult>;
};

export function createGroupsService(): GroupsService {
  return {
    listGroups: async ({ userId, limit, cursor }) => {
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
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          take: limit + 1,
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

      const hasNextPage = rows.length > limit;
      const pageRows = hasNextPage ? rows.slice(0, limit) : rows;
      const nextCursor = hasNextPage ? pageRows[pageRows.length - 1]?.id ?? null : null;

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
          limit,
          total,
          nextCursor,
        },
      };
    },
  };
}
