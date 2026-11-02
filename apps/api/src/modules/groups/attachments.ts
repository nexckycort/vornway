import { Context, Data, Effect, Layer } from 'effect';
import { env } from '#/config/env';
import { GROUP_IMAGE_ASSET_BASE_URL } from '#/infrastructure/storage/image-urls';

export class AttachmentError extends Data.TaggedError('AttachmentError')<{
  readonly cause: unknown;
}> {}

const MAX_BYTES = 10 * 1024 * 1024;
const FOLDER_PREFIX = '/groups/';
const DATA_URL = /^data:([^;]+);base64,(.+)$/;

export class ExpenseAttachments extends Context.Service<
  ExpenseAttachments,
  {
    upload(input: {
      groupId: string;
      expenseId: string;
      dataUrl: string;
    }): Effect.Effect<string, AttachmentError>;
    remove(
      pathOrUrl: string | null | undefined,
    ): Effect.Effect<void, AttachmentError>;
  }
>()('vornway/groups/ExpenseAttachments') {
  static readonly layer = Layer.succeed(
    ExpenseAttachments,
    ExpenseAttachments.of({
      upload: Effect.fn('ExpenseAttachments.upload')(function* (input) {
        const match = input.dataUrl.match(DATA_URL);
        const base64 = match?.[2];
        if (!base64) {
          return yield* new AttachmentError({
            cause: 'La imagen del gasto no es válida',
          });
        }
        const bytes = Buffer.from(base64, 'base64');
        if (bytes.byteLength > MAX_BYTES) {
          return yield* new AttachmentError({
            cause: 'La imagen no puede superar 10 MB',
          });
        }

        const bucket = yield* env.cloudflareBucketName.pipe(
          Effect.mapError((cause) => new AttachmentError({ cause })),
        );
        const key = `groups/${input.groupId}/expenses/${input.expenseId}/attachment.webp`;
        yield* Effect.tryPromise({
          try: async () => {
            const { PutObjectCommand } = await import('@aws-sdk/client-s3');
            const { S3 } = await import('#/infrastructure/storage/r2');
            const body = await new Bun.Image(bytes)
              .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 78 })
              .bytes();
            await S3.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
              }),
            );
          },
          catch: (cause) => new AttachmentError({ cause }),
        });
        return `/${key}`;
      }),
      remove: Effect.fn('ExpenseAttachments.remove')(function* (pathOrUrl) {
        const key = attachmentKey(pathOrUrl);
        if (!key) return;
        const bucket = yield* env.cloudflareBucketName.pipe(
          Effect.mapError((cause) => new AttachmentError({ cause })),
        );
        yield* Effect.tryPromise({
          try: async () => {
            const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
            const { S3 } = await import('#/infrastructure/storage/r2');
            await S3.send(
              new DeleteObjectCommand({ Bucket: bucket, Key: key }),
            );
          },
          catch: (cause) => new AttachmentError({ cause }),
        });
      }),
    }),
  );
}

const attachmentKey = (pathOrUrl: string | null | undefined) => {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('/')) {
    return pathOrUrl.startsWith(FOLDER_PREFIX) ? pathOrUrl.slice(1) : null;
  }
  if (!pathOrUrl.startsWith(GROUP_IMAGE_ASSET_BASE_URL)) return null;
  const pathname = URL.canParse(pathOrUrl) ? new URL(pathOrUrl).pathname : '';
  return pathname.startsWith(FOLDER_PREFIX) ? pathname.slice(1) : null;
};
