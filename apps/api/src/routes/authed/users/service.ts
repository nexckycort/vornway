import { Effect } from 'effect';
import { Database } from '#/infrastructure/database/context';
import type { WithUserId } from '#/shared/types/app';
import {
  UserImageUpdateError,
  UserImageUploadError,
  UserNotFoundError,
  UsernameAlreadyTakenError,
  UsernameUpdateError,
  UserSearchError,
} from './errors';
import { userRepository } from './repository';
import type {
  SearchUsersQueryInput,
  UpdateUserAvatarInput,
  UpdateUsernameInput,
} from './schema';
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
          username: user.username,
          email: user.email,
          isCurrentUser: user.id === userId,
        })),
      };
    }).pipe(Effect.withSpan('users.search'));
  },
  updateCurrentUserUsername: ({
    userId,
    username,
  }: WithUserId<UpdateUsernameInput>) =>
    Effect.gen(function* () {
      const db = yield* Database;
      const normalizedUsername = username.trim().toLowerCase();

      const result = yield* Effect.tryPromise({
        try: async () => {
          const user = await userRepository.updateUsername(db, {
            userId,
            username: normalizedUsername,
          });

          return {
            id: user.id,
            username: user.username,
            updatedAt: user.updatedAt,
          };
        },
        catch: (cause) => {
          if (
            typeof cause === 'object' &&
            cause !== null &&
            'code' in cause &&
            cause.code === 'P2002'
          ) {
            return new UsernameAlreadyTakenError({
              username: normalizedUsername,
            });
          }

          if (cause instanceof UsernameAlreadyTakenError) {
            return cause;
          }

          return new UsernameUpdateError({ cause });
        },
      });

      return {
        id: result.id,
        username: result.username,
      };
    }).pipe(Effect.withSpan('users.update_current_user_username')),
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
