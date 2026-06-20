import type { Tx } from '#/infrastructure/database/connection';

export const userRepository = {
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
