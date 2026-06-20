import { db } from '~/infrastructure/database/connection';
import type { WithUserId } from '~/shared/types/app';
import { userRepository } from './repository';
import type { SearchUsersQueryInput, UpdateUserAvatarInput } from './schema';
import {
  deleteUserImage,
  resolveUserImageUrl,
  uploadUserImage,
} from './user-image.service';

export const userService = {
  searchUsers: async ({ userId, query }: WithUserId<SearchUsersQueryInput>) => {
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

    return {
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        isCurrentUser: user.id === userId,
      })),
    };
  },
  updateCurrentUserImage: async ({
    userId,
    dataUrl,
  }: WithUserId<UpdateUserAvatarInput>) => {
    const nextImageUrl = await uploadUserImage({
      userId,
      dataUrl,
    });

    return await db.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { image: true },
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const updatedUser = await userRepository.updateAvatar(tx, {
        userId,
        imageUrl: nextImageUrl,
      });

      if (currentUser.image && currentUser.image !== nextImageUrl) {
        await deleteUserImage(currentUser.image).catch(() => undefined);
      }

      return {
        imageUrl: resolveUserImageUrl(updatedUser.image, updatedUser.updatedAt),
      };
    });
  },
};
