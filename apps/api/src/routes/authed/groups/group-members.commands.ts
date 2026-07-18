import { db } from '#/infrastructure/database/connection';
import { notificationInbox } from '#/infrastructure/notifications/notification-inbox';
import { pushNotifications } from '#/infrastructure/push/push-notifications';
import { groupErrors } from './groups.errors';
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
          payers: {
            some: {
              memberId: input.memberId,
            },
          },
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

export function createGroupMembersOperations() {
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
        throw groupErrors.accessDenied();
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

            const payload = buildGroupMemberAddedPushPayload({
              groupId,
              groupName: group.name,
              addedByName: name,
            });

            await notificationInbox.createForUsers({
              userIds: [linkedUserId],
              type: 'group.member.added',
              title: payload.title,
              body: payload.body,
              url: payload.url,
              groupId,
              actorName: name,
            });

            await pushNotifications.sendToUsers([linkedUserId], payload);
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
        throw groupErrors.accessDenied();
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
        throw groupErrors.accessDenied();
      }

      if (group.ownerId !== userId) {
        throw groupErrors.memberRemoveForbidden();
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
        throw groupErrors.memberNotFound();
      }

      if (
        targetMember.userId === group.ownerId ||
        targetMember.role === 'admin'
      ) {
        throw groupErrors.ownerRemoveForbidden();
      }

      const usageCount = await getMemberExpenseUsageCount({
        groupId,
        memberId: targetMember.id,
      });
      if (usageCount > 0) {
        throw groupErrors.memberHasExpenses();
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
        throw groupErrors.accessDenied();
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
        throw groupErrors.accessDenied();
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
        throw groupErrors.memberNotFound();
      }

      const isSelfUnlink = targetMember.userId === userId;

      if (!isSelfUnlink && group.ownerId !== userId) {
        throw groupErrors.memberUnlinkForbidden();
      }

      if (!targetMember.userId) {
        throw groupErrors.memberAlreadyUnlinked();
      }

      if (targetMember.userId === group.ownerId && !isSelfUnlink) {
        throw groupErrors.ownerUnlinkForbidden();
      }

      const usageCount = await getMemberExpenseUsageCount({
        groupId,
        memberId: targetMember.id,
      });
      const shouldDeleteMember = isSelfUnlink && usageCount === 0;

      await db.$transaction(async (tx) => {
        if (shouldDeleteMember) {
          await tx.groupMember.delete({
            where: { id: targetMember.id },
          });
        } else {
          await tx.groupMember.update({
            where: { id: targetMember.id },
            data: {
              userId: null,
            },
          });
        }

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
        throw groupErrors.accessDenied();
      }

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        return { data: [] };
      }

      const users = await db.user.findMany({
        where: {
          OR: [
            {
              username: {
                contains: trimmedQuery,
                mode: 'insensitive',
              },
            },
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
          username: true,
          email: true,
        },
        orderBy: [{ username: 'asc' }, { name: 'asc' }, { email: 'asc' }],
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
          username: candidate.username,
          email: candidate.email,
          isCurrentUser: candidate.id === userId,
          isAlreadyMember: memberUserIds.has(candidate.id),
        })),
      };
    },
  };
}
