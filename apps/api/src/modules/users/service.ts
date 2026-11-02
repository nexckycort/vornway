import type { InternalError } from '@vornway/contracts/errors';
import type {
  UpdatedUsername,
  UserImage,
  UserSearchResult,
} from '@vornway/contracts/modules/users/contract';
import {
  UserImageRejected,
  UserNotFound,
  UsernameAlreadyTaken,
} from '@vornway/contracts/modules/users/contract';
import { Context, Effect, Layer } from 'effect';
import { Database } from '#/infrastructure/database/database';
import { resolveUserImageUrl } from '#/infrastructure/storage/image-urls';
import { Storage } from '#/infrastructure/storage/storage';

const SEARCH_LIMIT = 5;

export class Users extends Context.Service<
  Users,
  {
    search(
      userId: string,
      query: string,
    ): Effect.Effect<{ data: (typeof UserSearchResult.Type)[] }, InternalError>;
    updateUsername(
      userId: string,
      username: string,
    ): Effect.Effect<
      typeof UpdatedUsername.Type,
      UsernameAlreadyTaken | UserNotFound | InternalError
    >;
    updateImage(
      userId: string,
      dataUrl: string,
    ): Effect.Effect<
      typeof UserImage.Type,
      UserNotFound | UserImageRejected | InternalError
    >;
  }
>()('vornway/users/Users') {
  static readonly layer = Layer.effect(
    Users,
    Effect.gen(function* () {
      const database = yield* Database;
      const storage = yield* Storage;

      const search = Effect.fn('Users.search')(function* (
        userId: string,
        query: string,
      ) {
        const users = yield* database.use((db) =>
          db.user.findMany({
            where: {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
            select: { id: true, name: true, username: true, email: true },
            orderBy: [{ username: 'asc' }, { name: 'asc' }, { email: 'asc' }],
            take: SEARCH_LIMIT,
          }),
        );
        return {
          data: users.map((user) => ({
            ...user,
            isCurrentUser: user.id === userId,
          })),
        };
      });

      const updateUsername = Effect.fn('Users.updateUsername')(function* (
        userId: string,
        username: string,
      ) {
        return yield* database
          .attempt((db) =>
            db.user.update({
              where: { id: userId },
              data: { username },
              select: { id: true, username: true },
            }),
          )
          .pipe(
            Effect.catchTag('DatabaseError', (error) =>
              Effect.gen(function* () {
                if (error.isUniqueViolation) {
                  return yield* new UsernameAlreadyTaken();
                }
                if (error.isNotFound) return yield* new UserNotFound();
                return yield* database.internal(error);
              }),
            ),
          );
      });

      const updateImage = Effect.fn('Users.updateImage')(function* (
        userId: string,
        dataUrl: string,
      ) {
        const nextImageUrl = yield* storage
          .uploadUserImage({ userId, dataUrl })
          .pipe(
            Effect.catchTag('StorageError', (error) =>
              Effect.logWarning('User image upload failed', error).pipe(
                Effect.andThen(Effect.fail(new UserImageRejected())),
              ),
            ),
          );

        const updated = yield* database.transaction(async (tx) => {
          const current = await tx.user.findUnique({
            where: { id: userId },
            select: { image: true },
          });
          if (!current) return null;
          const user = await tx.user.update({
            where: { id: userId },
            data: { image: nextImageUrl },
            select: { image: true, updatedAt: true },
          });
          return { previous: current.image, user };
        });
        if (!updated) return yield* new UserNotFound();

        if (updated.previous && updated.previous !== nextImageUrl) {
          yield* storage
            .deleteUserImage(updated.previous)
            .pipe(Effect.ignore({ log: true }));
        }
        return {
          imageUrl: resolveUserImageUrl(
            updated.user.image,
            updated.user.updatedAt,
          ),
        };
      });

      return Users.of({ search, updateUsername, updateImage });
    }),
  );
}
