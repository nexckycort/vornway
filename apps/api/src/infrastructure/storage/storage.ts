import { Context, Data, Effect, Layer, Redacted } from 'effect';
import { env } from '#/config/env';
import { storageKey } from './image-urls';

export class StorageError extends Data.TaggedError('StorageError')<{
  readonly cause: unknown;
}> {}

export type StoredObject = {
  readonly bytes: Uint8Array;
  readonly contentType: string;
};

type Removal = Effect.Effect<void, StorageError>;

export class Storage extends Context.Service<
  Storage,
  {
    uploadUserImage(input: {
      userId: string;
      dataUrl: string;
    }): Effect.Effect<string, StorageError>;
    deleteUserImage(imageUrl: string | null | undefined): Removal;
    uploadGroupImage(input: {
      groupId: string;
      dataUrl: string;
    }): Effect.Effect<string, StorageError>;
    deleteGroupImage(imageUrl: string | null | undefined): Removal;
    uploadExpenseAttachment(input: {
      groupId: string;
      expenseId: string;
      dataUrl: string;
    }): Effect.Effect<string, StorageError>;
    deleteExpenseAttachment(pathOrUrl: string | null | undefined): Removal;
    uploadFeedbackImage(input: {
      userId: string;
      feedbackId: string;
      index: number;
      dataUrl: string;
    }): Effect.Effect<string, StorageError>;
    deleteFeedbackImage(pathOrUrl: string | null | undefined): Removal;
    getObject(key: string): Effect.Effect<StoredObject | null, StorageError>;
  }
>()('@vornway/api/infrastructure/storage/storage') {
  static readonly layer = Layer.effect(
    Storage,
    Effect.gen(function* () {
      const {
        DeleteObjectCommand,
        GetObjectCommand,
        NoSuchKey,
        PutObjectCommand,
        S3Client,
      } = yield* Effect.promise(() => import('@aws-sdk/client-s3'));
      const accountId = yield* env.cloudflareAccountId;
      const accessKeyId = yield* env.cloudflareAccessKeyId;
      const secretAccessKey = yield* env.cloudflareSecretAccessKey;
      const bucket = yield* env.cloudflareBucketName;
      const client = yield* Effect.acquireRelease(
        Effect.sync(
          () =>
            new S3Client({
              region: 'auto',
              endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId,
                secretAccessKey: Redacted.value(secretAccessKey),
              },
              requestChecksumCalculation: 'WHEN_REQUIRED',
              responseChecksumValidation: 'WHEN_REQUIRED',
            }),
        ),
        (s3) => Effect.sync(() => s3.destroy()),
      );

      const attempt = <A>(operation: () => Promise<A>) =>
        Effect.tryPromise({
          try: operation,
          catch: (cause) => new StorageError({ cause }),
        });

      const uploadImage = (key: string, dataUrl: string, spec: ImageSpec) =>
        compressImage(dataUrl, spec).pipe(
          Effect.flatMap((body) =>
            attempt(() =>
              client.send(
                new PutObjectCommand({
                  Bucket: bucket,
                  Key: key,
                  Body: body,
                  ContentType: 'image/webp',
                  CacheControl: 'public, max-age=31536000, immutable',
                }),
              ),
            ),
          ),
          Effect.as(`/${key}`),
        );

      const deleteImage = (
        folder: string,
        pathOrUrl: string | null | undefined,
      ) => {
        const key = storageKey(folder, pathOrUrl);
        if (key === null) return Effect.void;
        return attempt(() =>
          client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
        ).pipe(Effect.asVoid);
      };

      return Storage.of({
        uploadUserImage: Effect.fn('Storage.uploadUserImage')((input) =>
          uploadImage(
            `${USERS_FOLDER}/${input.userId}/avatar.webp`,
            input.dataUrl,
            { size: 400, quality: 78 },
          ),
        ),
        deleteUserImage: Effect.fn('Storage.deleteUserImage')((imageUrl) =>
          deleteImage(USERS_FOLDER, imageUrl),
        ),
        uploadGroupImage: Effect.fn('Storage.uploadGroupImage')((input) =>
          uploadImage(
            `${GROUPS_FOLDER}/${input.groupId}/cover.webp`,
            input.dataUrl,
            { size: 640, quality: 78 },
          ),
        ),
        deleteGroupImage: Effect.fn('Storage.deleteGroupImage')((imageUrl) =>
          deleteImage(GROUPS_FOLDER, imageUrl),
        ),
        uploadExpenseAttachment: Effect.fn('Storage.uploadExpenseAttachment')(
          (input) =>
            uploadImage(
              `${GROUPS_FOLDER}/${input.groupId}/expenses/${input.expenseId}/attachment.webp`,
              input.dataUrl,
              { size: 640, quality: 78 },
            ),
        ),
        deleteExpenseAttachment: Effect.fn('Storage.deleteExpenseAttachment')(
          (pathOrUrl) => deleteImage(GROUPS_FOLDER, pathOrUrl),
        ),
        uploadFeedbackImage: Effect.fn('Storage.uploadFeedbackImage')((input) =>
          uploadImage(
            `${FEEDBACK_FOLDER}/${input.userId}/${input.feedbackId}/attachment-${input.index + 1}.webp`,
            input.dataUrl,
            { size: 1280, quality: 80 },
          ),
        ),
        deleteFeedbackImage: Effect.fn('Storage.deleteFeedbackImage')(
          (pathOrUrl) => deleteImage(FEEDBACK_FOLDER, pathOrUrl),
        ),
        getObject: Effect.fn('Storage.getObject')((key) =>
          attempt(async () => {
            const object = await client.send(
              new GetObjectCommand({ Bucket: bucket, Key: key }),
            );
            const bytes = await object.Body?.transformToByteArray();
            return bytes
              ? { bytes, contentType: object.ContentType ?? 'image/webp' }
              : null;
          }).pipe(
            Effect.catchIf(
              (error) => error.cause instanceof NoSuchKey,
              () => Effect.succeed(null),
            ),
          ),
        ),
      });
    }),
  );
}

export const USERS_FOLDER = 'users';
export const GROUPS_FOLDER = 'groups';
export const FEEDBACK_FOLDER = 'feedback';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const DATA_URL = /^data:([^;]+);base64,(.+)$/;

type ImageSpec = { readonly size: number; readonly quality: number };

export const compressImage = Effect.fn('Storage.compressImage')(function* (
  dataUrl: string,
  spec: ImageSpec,
) {
  const base64 = DATA_URL.exec(dataUrl)?.[2];
  if (!base64) return yield* new StorageError({ cause: 'invalid data url' });

  const bytes = Buffer.from(base64, 'base64');
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return yield* new StorageError({ cause: 'image larger than 10 MB' });
  }

  return yield* Effect.tryPromise({
    try: () =>
      new Bun.Image(bytes)
        .resize(spec.size, spec.size, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: spec.quality })
        .bytes(),
    catch: (cause) => new StorageError({ cause }),
  });
});
