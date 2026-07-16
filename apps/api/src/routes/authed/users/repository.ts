import type { Tx } from '#/infrastructure/database/connection';

export const userRepository = {
  search: async (tx: Tx, input: { query: string; limit: number }) => {
    const users = await tx.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: input.query,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: input.query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: input.query,
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
      take: input.limit,
    });

    return users;
  },
  updateUsername: async (
    tx: Tx,
    input: { userId: string; username: string },
  ) => {
    const updatedUser = await tx.user.update({
      where: { id: input.userId },
      data: { username: input.username },
      select: {
        id: true,
        username: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  },
  updateAvatar: async (tx: Tx, input: { userId: string; imageUrl: string }) => {
    const updatedUser = await tx.user.update({
      where: { id: input.userId },
      data: { image: input.imageUrl },
      select: {
        image: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  },
};
