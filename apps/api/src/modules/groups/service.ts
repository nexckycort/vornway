import { db } from '~/infrastructure/database/connection';
import type {
  CreateGroupInput,
  CreateGroupResult,
  GroupListItem,
  ListGroupsInput,
  ListGroupsResult,
} from './types';

export type GroupsService = {
  listGroups: (input: ListGroupsInput) => Promise<ListGroupsResult>;
  createGroup: (input: CreateGroupInput) => Promise<CreateGroupResult>;
};

async function generateInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = crypto.randomUUID().slice(0, 8);
    const exists = await db.group.findUnique({
      where: { inviteCode },
      select: { id: true },
    });

    if (!exists) {
      return inviteCode;
    }
  }

  throw new Error('No se pudo generar un código de invitación único');
}

export function createGroupsService(): GroupsService {
  return {
    createGroup: async ({ userId, ownerName, name, type, description }) => {
      const now = new Date();
      const inviteCode = await generateInviteCode();
      const groupId = crypto.randomUUID();
      const normalizedName = name.trim();
      const normalizedType = type.trim();
      const normalizedDescription = description?.trim() || null;

      await db.$transaction(async (tx) => {
        await tx.group.create({
          data: {
            id: groupId,
            name: normalizedName,
            type: normalizedType,
            description: normalizedDescription,
            createdAt: now,
            updatedAt: now,
            ownerId: userId,
            inviteCode,
          },
        });

        await tx.groupMember.create({
          data: {
            groupId,
            userId,
            name: ownerName,
            role: 'admin',
            joinedAt: now,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: ownerName,
            action: 'group.created',
            targetName: normalizedName,
            details: {
              type: normalizedType,
            },
            createdAt: now,
          },
        });
      });

      return {
        id: groupId,
        name: normalizedName,
        type: normalizedType,
        description: normalizedDescription,
        inviteCode,
        createdAt: now,
      };
    },
    listGroups: async ({ userId, limit, cursor }) => {
      const where: NonNullable<Parameters<typeof db.group.findMany>[0]>['where'] = {
        OR: [
          {
            ownerId: userId,
          },
          {
            GroupMember: {
              some: {
                userId,
              },
            },
          },
        ],
      };

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
