import { db } from '#/infrastructure/database/connection';
import { getVersionedGroupImageUrl } from '#/infrastructure/storage/group-images';
import { inviteErrors } from './invites.errors';
import type {
  AcceptInviteInput,
  AcceptInviteResult,
  InvitePreviewResult,
} from './types';

export type InviteOperations = {
  getPreview: (input: {
    userId: string;
    inviteCode: string;
  }) => Promise<InvitePreviewResult>;
  acceptInvite: (input: AcceptInviteInput) => Promise<AcceptInviteResult>;
};

function normalizeName(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export function createInviteOperations(): InviteOperations {
  return {
    getPreview: async ({ userId, inviteCode }) => {
      const group = await db.group.findUnique({
        where: { inviteCode },
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          imageUrl: true,
          updatedAt: true,
          inviteCode: true,
          owner: {
            select: {
              name: true,
            },
          },
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
            orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
          },
        },
      });

      if (!group) {
        throw inviteErrors.groupNotFound();
      }

      const existingMembership = group.GroupMember.find(
        (member) => member.userId === userId,
      );

      return {
        group: {
          id: group.id,
          name: group.name,
          type: group.type,
          description: group.description,
          imageUrl: getVersionedGroupImageUrl(group.imageUrl, group.updatedAt),
          inviteCode: group.inviteCode,
          ownerName: group.owner?.name ?? null,
          memberCount: group.GroupMember.length,
        },
        unregisteredMembers: group.GroupMember.filter(
          (member) => member.userId === null,
        ).map((member) => ({
          id: member.id,
          name: member.name,
        })),
        alreadyMember: Boolean(existingMembership),
      };
    },
    acceptInvite: async ({
      userId,
      userName,
      userEmail,
      inviteCode,
      memberId,
    }) => {
      const group = await db.group.findUnique({
        where: { inviteCode },
        select: {
          id: true,
          type: true,
          GroupMember: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
        },
      });

      if (!group) {
        throw inviteErrors.groupNotFound();
      }

      const existingMembership = await db.groupMember.findFirst({
        where: {
          groupId: group.id,
          userId,
        },
        select: {
          id: true,
        },
      });

      if (existingMembership) {
        return {
          groupId: group.id,
          groupType: group.type,
          memberId: existingMembership.id,
        };
      }

      const currentUserName = normalizeName(userName);
      const fallbackName =
        currentUserName || normalizeName(userEmail?.split('@')[0]) || 'Usuario';

      if (memberId) {
        const selectedMember = await db.groupMember.findFirst({
          where: {
            id: memberId,
            groupId: group.id,
          },
          select: {
            id: true,
            name: true,
            userId: true,
          },
        });

        if (!selectedMember) {
          throw inviteErrors.memberNotFound();
        }

        if (selectedMember.userId) {
          throw inviteErrors.memberAlreadyLinked();
        }

        const finalName = normalizeName(selectedMember.name) || fallbackName;

        await db.groupMember.update({
          where: {
            id: selectedMember.id,
          },
          data: {
            userId,
          },
        });

        if (
          !currentUserName ||
          currentUserName.toLowerCase() === 'anonymous' ||
          finalName !== currentUserName
        ) {
          await db.user.update({
            where: {
              id: userId,
            },
            data: {
              name: finalName,
            },
          });
        }

        return {
          groupId: group.id,
          groupType: group.type,
          memberId: selectedMember.id,
        };
      }

      const createdMember = await db.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          name: fallbackName,
          role: 'member',
        },
        select: {
          id: true,
        },
      });

      if (!currentUserName || currentUserName.toLowerCase() === 'anonymous') {
        await db.user.update({
          where: {
            id: userId,
          },
          data: {
            name: fallbackName,
          },
        });
      }

      return {
        groupId: group.id,
        groupType: group.type,
        memberId: createdMember.id,
      };
    },
  };
}
