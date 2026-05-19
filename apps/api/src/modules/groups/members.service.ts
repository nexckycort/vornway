import { db } from '~/infrastructure/database/connection';
import { pushNotificationService } from '~/modules/push';
import {
  buildActiveExpenseWhere,
  buildActiveGroupMemberWhere,
  buildGroupAccessWhere,
} from './helpers';
import { buildGroupMemberAddedPushPayload } from './push-notifications';
import type {
  AddGroupMemberInput,
  RemoveGroupMemberInput,
  SearchGroupMembersResult,
  UnlinkGroupMemberInput,
} from './types';

async function getMemberExpenseUsageCount(input: {
  groupId: string;
  memberId: string;
}) {
  return db.expense.count({
    where: {
      ...buildActiveExpenseWhere(input.groupId),
      OR: [
        {
          paidById: input.memberId,
        },
        {
          participants: {
            some: {
              memberId: input.memberId,
            },
          },
        },
      ],
    },
  });
}

export function createGroupMembersService() {
  return {
    addMember: async ({
      userId,
      groupId,
      name,
      linkedUserId,
    }: AddGroupMemberInput): Promise<{ id: string; name: string }> => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: { id: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      let member: { id: string; name: string } | null = null;
      let shouldNotify = false;

      if (linkedUserId) {
        const existingLinkedMember = await db.groupMember.findFirst({
          where: {
            groupId,
            userId: linkedUserId,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (existingLinkedMember) {
          return existingLinkedMember;
        }
      }

      if (!member) {
        member = await db.groupMember.create({
          data: {
            groupId,
            name,
            ...(linkedUserId ? { userId: linkedUserId } : {}),
            role: 'member',
          },
          select: {
            id: true,
            name: true,
          },
        });
        shouldNotify = Boolean(linkedUserId);
      }

      if (linkedUserId && shouldNotify) {
        void (async () => {
          try {
            const [group, recipient] = await Promise.all([
              db.group.findUnique({
                where: { id: groupId },
                select: { name: true },
              }),
              db.user.findUnique({
                where: { id: linkedUserId },
                select: { id: true },
              }),
            ]);

            if (!group || !recipient) {
              return;
            }

            await pushNotificationService.sendToUsers(
              [linkedUserId],
              buildGroupMemberAddedPushPayload({
                groupId,
                groupName: group.name,
                addedByName: name,
              }),
            );
          } catch (error) {
            console.warn('Failed to send group member push notification', {
              groupId,
              error,
            });
          }
        })();
      }

      return member;
    },
    removeMember: async ({
      userId,
      groupId,
      memberId,
    }: RemoveGroupMemberInput): Promise<{ id: string; name: string }> => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: {
          id: true,
          name: true,
        },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      });

      if (!group) {
        throw new Error('No tienes acceso a este grupo');
      }

      if (group.ownerId !== userId) {
        throw new Error('Solo el creador puede eliminar participantes');
      }

      const targetMember = await db.groupMember.findFirst({
        where: {
          id: memberId,
          groupId,
        },
        select: {
          id: true,
          name: true,
          userId: true,
          role: true,
        },
      });

      if (!targetMember) {
        throw new Error('Participante no encontrado');
      }

      if (
        targetMember.userId === group.ownerId ||
        targetMember.role === 'admin'
      ) {
        throw new Error('No puedes eliminar al creador del grupo');
      }

      const usageCount = await getMemberExpenseUsageCount({
        groupId,
        memberId: targetMember.id,
      });
      if (usageCount > 0) {
        throw new Error('El participante ya tiene gastos');
      }

      await db.$transaction(async (tx) => {
        await tx.groupMember.delete({
          where: { id: targetMember.id },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'group.member_removed',
            targetName: targetMember.name,
            details: {
              memberId: targetMember.id,
            },
          },
        });
      });

      return {
        id: targetMember.id,
        name: targetMember.name,
      };
    },
    unlinkMember: async ({
      userId,
      groupId,
      memberId,
    }: UnlinkGroupMemberInput): Promise<{ id: string; name: string }> => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: {
          id: true,
          name: true,
        },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      });

      if (!group) {
        throw new Error('No tienes acceso a este grupo');
      }

      if (group.ownerId !== userId) {
        throw new Error('Solo el creador puede desvincular participantes');
      }

      const targetMember = await db.groupMember.findFirst({
        where: {
          id: memberId,
          groupId,
        },
        select: {
          id: true,
          name: true,
          userId: true,
          role: true,
        },
      });

      if (!targetMember) {
        throw new Error('Participante no encontrado');
      }

      if (!targetMember.userId) {
        throw new Error('El participante ya no tiene una cuenta vinculada');
      }

      if (targetMember.userId === group.ownerId) {
        throw new Error('No puedes desvincular al creador del grupo');
      }

      await db.$transaction(async (tx) => {
        await tx.groupMember.update({
          where: { id: targetMember.id },
          data: {
            userId: null,
          },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: membership.name,
            action: 'group.member_unlinked',
            targetName: targetMember.name,
            details: {
              memberId: targetMember.id,
            },
          },
        });
      });

      return {
        id: targetMember.id,
        name: targetMember.name,
      };
    },
    searchMembers: async ({
      userId,
      groupId,
      query,
    }: {
      userId: string;
      groupId: string;
      query: string;
    }): Promise<SearchGroupMembersResult> => {
      const membership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: { id: true },
      });

      if (!membership) {
        throw new Error('No tienes acceso a este grupo');
      }

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return { data: [] };
      }

      const users = await db.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: trimmedQuery,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: trimmedQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
        take: 8,
      });

      const memberUserIds = new Set(
        (
          await db.groupMember.findMany({
            where: {
              groupId,
              userId: {
                in: users.map((candidate) => candidate.id),
              },
            },
            select: { userId: true },
          })
        )
          .map((member) => member.userId)
          .filter((value): value is string => Boolean(value)),
      );

      return {
        data: users.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          isCurrentUser: candidate.id === userId,
          isAlreadyMember: memberUserIds.has(candidate.id),
        })),
      };
    },
  };
}
