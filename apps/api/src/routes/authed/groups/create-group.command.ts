import { db } from '#/infrastructure/database/connection';
import {
  getVersionedGroupImageUrl,
  uploadGroupImage,
} from '#/infrastructure/storage/group-images';
import type { CreateGroupInput, CreateGroupResult } from './types';

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

export function createGroupCreateOperations() {
  return {
    createGroup: async ({
      id,
      userId,
      ownerName,
      name,
      type,
      description,
      image,
      participants,
    }: CreateGroupInput): Promise<CreateGroupResult> => {
      const now = new Date();
      const inviteCode = await generateInviteCode();
      const groupId = id?.trim() || crypto.randomUUID();
      const normalizedName = name.trim();
      const normalizedType = type.trim();
      const normalizedDescription = description?.trim() || null;
      const imageUrl = image
        ? await uploadGroupImage({
            groupId,
            dataUrl: image.dataUrl,
          }).catch(() => null)
        : null;

      await db.$transaction(async (tx) => {
        await tx.group.create({
          data: {
            id: groupId,
            name: normalizedName,
            type: normalizedType,
            description: normalizedDescription,
            imageUrl,
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

        const normalizedParticipants = (participants ?? [])
          .map((participant) => ({
            name: participant.name.trim(),
            userId: participant.userId?.trim() || null,
          }))
          .filter((participant) => participant.name.length > 0)
          .filter((participant) => participant.userId !== userId)
          .filter(
            (participant, index, array) =>
              array.findIndex(
                (item) =>
                  (item.userId && item.userId === participant.userId) ||
                  (!item.userId &&
                    item.name.toLocaleLowerCase('es-CO') ===
                      participant.name.toLocaleLowerCase('es-CO')),
              ) === index,
          );

        if (normalizedParticipants.length > 0) {
          await tx.groupMember.createMany({
            data: normalizedParticipants.map((participant) => ({
              groupId,
              userId: participant.userId,
              name: participant.name,
              role: 'member',
              joinedAt: now,
            })),
          });
        }

        await tx.activityLog.create({
          data: {
            groupId,
            actorUserId: userId,
            actorName: ownerName,
            action: 'group.created',
            targetName: normalizedName,
            details: {
              type: normalizedType,
              participantsCount: (participants ?? []).length,
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
        imageUrl: getVersionedGroupImageUrl(imageUrl, now),
        inviteCode,
        createdAt: now,
      };
    },
  };
}
