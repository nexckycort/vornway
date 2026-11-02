import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Context, Data, Effect, Layer, Redacted } from 'effect';
import { env } from '#/config/env';
import {
  FEEDBACK_ATTACHMENT_FOLDER,
  feedbackAttachmentKey,
} from './attachment-url';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export class FeedbackAttachmentError extends Data.TaggedError(
  'FeedbackAttachmentError',
)<{
  readonly cause: unknown;
}> {}

export class FeedbackAttachments extends Context.Service<
  FeedbackAttachments,
  {
    upload(input: {
      readonly userId: string;
      readonly feedbackId: string;
      readonly index: number;
      readonly dataUrl: string;
    }): Effect.Effect<string, FeedbackAttachmentError>;
    remove(url: string): Effect.Effect<void, FeedbackAttachmentError>;
  }
>()('vornway/feedback/FeedbackAttachments') {
  static readonly layer = Layer.effect(
    FeedbackAttachments,
    Effect.gen(function* () {
      const storage = yield* Effect.cached(
        Effect.gen(function* () {
          const accountId = yield* env.cloudflareAccountId;
          const accessKeyId = yield* env.cloudflareAccessKeyId;
          const secretAccessKey = yield* env.cloudflareSecretAccessKey;
          const bucket = yield* env.cloudflareBucketName;
          const client = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId,
              secretAccessKey: Redacted.value(secretAccessKey),
            },
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
          });
          return { client, bucket };
        }).pipe(
          Effect.mapError((cause) => new FeedbackAttachmentError({ cause })),
        ),
      );

      const upload = Effect.fn('FeedbackAttachments.upload')(function* (input) {
        const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match)
          return yield* new FeedbackAttachmentError({
            cause: 'invalid data url',
          });
        const bytes = Buffer.from(match[2], 'base64');
        if (bytes.byteLength > MAX_ATTACHMENT_BYTES)
          return yield* new FeedbackAttachmentError({ cause: 'too large' });

        const compressed = yield* Effect.tryPromise({
          try: () =>
            new Bun.Image(bytes)
              .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 80 })
              .bytes(),
          catch: (cause) => new FeedbackAttachmentError({ cause }),
        });

        const key = `${FEEDBACK_ATTACHMENT_FOLDER}/${input.userId}/${input.feedbackId}/attachment-${input.index + 1}.webp`;
        const { client, bucket } = yield* storage;
        yield* Effect.tryPromise({
          try: () =>
            client.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: compressed,
                ContentType: 'image/webp',
                CacheControl: 'public, max-age=31536000, immutable',
              }),
            ),
          catch: (cause) => new FeedbackAttachmentError({ cause }),
        });
        return `/${key}`;
      });

      const remove = Effect.fn('FeedbackAttachments.remove')(function* (url) {
        const key = feedbackAttachmentKey(url);
        if (key === null) return;
        const { client, bucket } = yield* storage;
        yield* Effect.tryPromise({
          try: () =>
            client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })),
          catch: (cause) => new FeedbackAttachmentError({ cause }),
        });
      });

      return FeedbackAttachments.of({ upload, remove });
    }),
  );
}
