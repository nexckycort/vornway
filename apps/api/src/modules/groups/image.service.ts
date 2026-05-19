import { db } from '~/infrastructure/database/connection';
import {
  deleteGroupImage,
  getVersionedGroupImageUrl,
  uploadGroupImage,
} from './group-image.service';
import type { UpdateGroupImageInput } from './types';
import { buildGroupAccessWhere } from './helpers';

export function createGroupImageService() {
  return {
    updateGroupImage: async ({
      userId,
      groupId,
      image,
    }: UpdateGroupImageInput) => {
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
        },
      });

      if (!group) {
        throw new Error('Grupo no encontrado');
      }

      const nextImageUrl = await uploadGroupImage({
        groupId,
        dataUrl: image.dataUrl,
      });
      const updatedAt = new Date();

      await db.group.update({
        where: { id: groupId },
        data: {
          imageUrl: nextImageUrl,
          updatedAt,
        },
      });

      if (group.imageUrl && group.imageUrl !== nextImageUrl) {
        await deleteGroupImage(group.imageUrl).catch(() => undefined);
      }

      return {
        imageUrl: getVersionedGroupImageUrl(nextImageUrl, updatedAt),
      };
    },
  };
}
