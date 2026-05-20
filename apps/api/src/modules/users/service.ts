import { db } from '~/infrastructure/database/connection';
import {
  deleteUserImage,
  resolveUserImageUrl,
  uploadUserImage,
} from './user-image.service';
import type { SearchUsersResult } from './types';

export type UsersService = {
  searchUsers: (input: {
    userId: string;
    query: string;
  }) => Promise<SearchUsersResult>;
  updateCurrentUserImage: (input: {
    userId: string;
    dataUrl: string;
  }) => Promise<{ imageUrl: string | null }>;
};

export function createUsersService(): UsersService {
  return {
    searchUsers: async ({ userId, query }) => {
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
    updateCurrentUserImage: async ({ userId, dataUrl }) => {
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: {
          image: true,
        },
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const nextImageUrl = await uploadUserImage({
        userId,
        dataUrl,
      });

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: { image: nextImageUrl },
        select: {
          image: true,
          updatedAt: true,
        },
      });

      if (currentUser.image && currentUser.image !== nextImageUrl) {
        await deleteUserImage(currentUser.image).catch(() => undefined);
      }

      return {
        imageUrl: resolveUserImageUrl(updatedUser.image, updatedUser.updatedAt),
      };
    },
  };
}
