import { db } from '#/infrastructure/database/connection';
import { groupErrors } from './groups.errors';
import { buildActiveGroupMemberWhere } from './helpers';
import type {
  TransferGroupOwnerInput,
  TransferGroupOwnerResult,
} from './types';

export function createGroupOwnerTransferOperations() {
  return {
    transferGroupOwner: async ({
      userId,
      groupId,
      memberId,
    }: TransferGroupOwnerInput): Promise<TransferGroupOwnerResult> => {
      const currentMembership = await db.groupMember.findFirst({
        where: buildActiveGroupMemberWhere(userId, groupId),
        select: {
          id: true,
          name: true,
        },
      });

      if (!currentMembership) {
        throw groupErrors.accessDenied();
      }

      const group = await db.group.findFirst({
        where: {
          id: groupId,
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
        throw groupErrors.ownerTransferForbidden();
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
        },
      });

      if (!targetMember) {
        throw groupErrors.memberNotFound();
      }

      if (!targetMember.userId) {
        throw groupErrors.ownerTransferTargetRequired();
      }

      const newOwnerId = targetMember.userId;

      if (newOwnerId === group.ownerId) {
        throw groupErrors.ownerTransferTargetSame();
      }

      const updatedAt = new Date();

      await db.$transaction(async (tx) => {
        await tx.group.update({
          where: { id: group.id },
          data: {
            ownerId: newOwnerId,
            updatedAt,
          },
        });

        await tx.groupMember.updateMany({
          where: {
            groupId,
            userId,
          },
          data: {
            role: 'member',
          },
        });

        await tx.groupMember.update({
          where: { id: targetMember.id },
          data: {
            role: 'admin',
          },
        });

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: currentMembership.name,
            action: 'group.owner_transferred',
            targetName: targetMember.name,
            details: {
              previousOwnerId: userId,
              newOwnerId,
              newOwnerMemberId: targetMember.id,
            },
            createdAt: updatedAt,
          },
        });
      });

      return {
        id: group.id,
        ownerId: newOwnerId,
        ownerMemberId: targetMember.id,
        ownerName: targetMember.name,
        updatedAt,
      };
    },
  };
}
