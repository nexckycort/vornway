import { Context, Data, Effect, Layer } from 'effect';

export class StorageError extends Data.TaggedError('StorageError')<{
  readonly cause: unknown;
}> {}

export class Storage extends Context.Service<
  Storage,
  {
    uploadUserImage(input: {
      userId: string;
      dataUrl: string;
    }): Effect.Effect<string, StorageError>;
    deleteUserImage(
      imageUrl: string | null | undefined,
    ): Effect.Effect<void, StorageError>;
    uploadGroupImage(input: {
      groupId: string;
      dataUrl: string;
    }): Effect.Effect<string, StorageError>;
    deleteGroupImage(
      imageUrl: string | null | undefined,
    ): Effect.Effect<void, StorageError>;
  }
>()('vornway/Storage') {
  static readonly layer = Layer.effect(
    Storage,
    Effect.gen(function* () {
      const users = yield* Effect.promise(() => import('./user-images'));
      const groups = yield* Effect.promise(() => import('./group-images'));
      const attempt = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: (cause) => new StorageError({ cause }),
        });

      return Storage.of({
        uploadUserImage: Effect.fn('Storage.uploadUserImage')((input) =>
          attempt(() => users.uploadUserImage(input)),
        ),
        deleteUserImage: Effect.fn('Storage.deleteUserImage')((imageUrl) =>
          attempt(() => users.deleteUserImage(imageUrl)),
        ),
        uploadGroupImage: Effect.fn('Storage.uploadGroupImage')((input) =>
          attempt(() => groups.uploadGroupImage(input)),
        ),
        deleteGroupImage: Effect.fn('Storage.deleteGroupImage')((imageUrl) =>
          attempt(() => groups.deleteGroupImage(imageUrl)),
        ),
      });
    }),
  );
}
