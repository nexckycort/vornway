import { db } from '~/infrastructure/database/connection';
import {
  deleteGroupImage,
  getVersionedGroupImageUrl,
  uploadGroupImage,
} from './group-image.service';
import { buildGroupAccessWhere } from './helpers';
import type { UpdateGroupInput, UpdateGroupResult } from './types';

export function createGroupUpdateService() {
  return {
    updateGroup: async ({
      userId,
      groupId,
      name,
      type,
      description,
      image,
    }: UpdateGroupInput): Promise<UpdateGroupResult> => {
      const group = await db.group.findFirst({
        where: {
          ...buildGroupAccessWhere(userId, groupId),
          type: {
            not: 'meta',
          },
        },
        select: {
          id: true,
          imageUrl: true,
          ownerId: true,
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      if (group.ownerId !== userId) {
        throw new Error('Solo el creador puede editar el grupo');
      }

      const normalizedName = name.trim();
      const normalizedType = type.trim();
      const normalizedDescription = description?.trim() || null;
      const updatedAt = new Date();

      const nextImageUrl = image
        ? await uploadGroupImage({
            groupId,
            dataUrl: image.dataUrl,
          })
        : group.imageUrl;

      await db.group.update({
        where: { id: groupId },
        data: {
          name: normalizedName,
          type: normalizedType,
          description: normalizedDescription,
          imageUrl: nextImageUrl,
          updatedAt,
        },
      });

      if (image && group.imageUrl && group.imageUrl !== nextImageUrl) {
        await deleteGroupImage(group.imageUrl).catch(() => undefined);
      }

      return {
        id: groupId,
        name: normalizedName,
        type: normalizedType,
        description: normalizedDescription,
        imageUrl: getVersionedGroupImageUrl(nextImageUrl, updatedAt),
        updatedAt,
      };
    },
  };
}
