import { db } from '#/infrastructure/database/connection';
import {
  deleteGroupImage,
  getVersionedGroupImageUrl,
  uploadGroupImage,
} from '#/infrastructure/storage/group-images';
import { groupErrors } from './groups.errors';
import { buildGroupAccessWhere } from './helpers';
import type { UpdateGroupImageInput } from './types';

export function createGroupImageOperations() {
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
        throw groupErrors.notFound();
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
