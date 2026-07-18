import { Prisma } from '#/generated/prisma/client';
import { db } from '#/infrastructure/database/connection';
import { usernameAlreadyTakenError, usernameUpdateError } from './errors';
import type { UpdateUsernameInput } from './schema';

export async function updateCurrentUserUsername(
  input: UpdateUsernameInput & { userId: string },
) {
  const normalizedUsername = input.username.trim().toLowerCase();

  try {
    const user = await db.user.update({
      where: { id: input.userId },
      data: { username: normalizedUsername },
      select: {
        id: true,
        username: true,
        updatedAt: true,
      },
    });

    return {
      id: user.id,
      username: user.username,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw usernameAlreadyTakenError();
    }

    throw usernameUpdateError(error);
  }
}
