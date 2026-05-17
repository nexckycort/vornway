import { db } from '~/infrastructure/database/connection';
import type { SearchUsersResult } from './types';

export type UsersService = {
  searchUsers: (input: { query: string }) => Promise<SearchUsersResult>;
};

export function createUsersService(): UsersService {
  return {
    searchUsers: async ({ query }) => {
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
        })),
      };
    },
  };
}
