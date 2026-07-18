import { db } from '#/infrastructure/database/connection';
import { userSearchError } from './errors';
import type { SearchUsersQueryInput } from './schema';

export async function searchUsers(
  input: SearchUsersQueryInput & { userId: string },
) {
  const trimmedQuery = input.query.trim();

  if (!trimmedQuery) {
    return { data: [] };
  }

  try {
    const users = await db.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: trimmedQuery,
              mode: 'insensitive',
            },
          },
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
        username: true,
        email: true,
      },
      orderBy: [{ username: 'asc' }, { name: 'asc' }, { email: 'asc' }],
      take: 5,
    });

    return {
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        isCurrentUser: user.id === input.userId,
      })),
    };
  } catch (error) {
    throw userSearchError(error);
  }
}
