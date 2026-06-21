import { Effect } from 'effect';
import { Database } from '#/infrastructure/database/context';
import type { WithUserId } from '#/shared/types/app';
import {
  UserImageUpdateError,
  UserImageUploadError,
  UserNotFoundError,
  UserSearchError,
} from './errors';
import { userRepository } from './repository';
import type { SearchUsersQueryInput, UpdateUserAvatarInput } from './schema';
import {
  deleteUserImage,
  resolveUserImageUrl,
  uploadUserImage,
} from './user-image.service';

export const userService = {
  searchUsers: ({ userId, query }: WithUserId<SearchUsersQueryInput>) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return Effect.succeed({ data: [] });
    }

    return Effect.gen(function* () {
      const db = yield* Database;

      const users = yield* Effect.tryPromise({
        try: () =>
          userRepository.search(db, {
            query: trimmedQuery,
            limit: 5,
          }),
        catch: (cause) =>
          new UserSearchError({
            cause,
          }),
      });

      return {
        data: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          isCurrentUser: user.id === userId,
        })),
      };
    }).pipe(Effect.withSpan('users.search'));
  },
  updateCurrentUserImage: ({
    userId,
    dataUrl,
  }: WithUserId<UpdateUserAvatarInput>) =>
    Effect.gen(function* () {
      const db = yield* Database;

      const nextImageUrl = yield* Effect.tryPromise({
        try: () =>
          uploadUserImage({
            userId,
            dataUrl,
          }),
        catch: (cause) =>
          new UserImageUploadError({
            cause,
          }),
      });

      const result = yield* Effect.tryPromise({
        try: () =>
          db.$transaction(async (tx) => {
            const currentUser = await tx.user.findUnique({
              where: { id: userId },
              select: { image: true },
            });

            if (!currentUser) {
              throw new UserNotFoundError({
                userId,
              });
            }

            const updatedUser = await userRepository.updateAvatar(tx, {
              userId,
              imageUrl: nextImageUrl,
            });

            return {
              oldImageUrl: currentUser.image,
              imageUrl: resolveUserImageUrl(
                updatedUser.image,
                updatedUser.updatedAt,
              ),
            };
          }),
        catch: (cause) => {
          if (cause instanceof UserNotFoundError) {
            return cause;
          }

          return new UserImageUpdateError({
            cause,
          });
        },
      });

      if (result.oldImageUrl && result.oldImageUrl !== nextImageUrl) {
        yield* Effect.tryPromise({
          try: () => deleteUserImage(result.oldImageUrl!),
          catch: () => undefined,
        }).pipe(Effect.ignore);
      }

      return {
        imageUrl: result.imageUrl,
      };
    }).pipe(Effect.withSpan('users.update_current_user_image')),
};
