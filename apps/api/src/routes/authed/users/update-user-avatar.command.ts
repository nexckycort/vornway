import { db } from '#/infrastructure/database/connection';
import {
  deleteUserImage,
  resolveUserImageUrl,
  uploadUserImage,
} from '#/infrastructure/storage/user-images';
import {
  userImageUpdateError,
  userImageUploadError,
  userNotFoundError,
} from './errors';
import type { UpdateUserAvatarInput } from './schema';

export async function updateCurrentUserImage(
  input: UpdateUserAvatarInput & { userId: string },
) {
  let nextImageUrl: string;

  try {
    nextImageUrl = await uploadUserImage({
      userId: input.userId,
      dataUrl: input.dataUrl,
    });
  } catch (error) {
    throw userImageUploadError(error);
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: input.userId },
        select: { image: true },
      });

      if (!currentUser) {
        throw userNotFoundError();
      }

      const updatedUser = await tx.user.update({
        where: { id: input.userId },
        data: { image: nextImageUrl },
        select: {
          image: true,
          updatedAt: true,
        },
      });

      return {
        oldImageUrl: currentUser.image,
        imageUrl: resolveUserImageUrl(updatedUser.image, updatedUser.updatedAt),
      };
    });

    if (result.oldImageUrl && result.oldImageUrl !== nextImageUrl) {
      await deleteUserImage(result.oldImageUrl).catch(() => undefined);
    }

    return {
      imageUrl: result.imageUrl,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'USER_NOT_FOUND'
    ) {
      throw error;
    }

    throw userImageUpdateError(error);
  }
}
