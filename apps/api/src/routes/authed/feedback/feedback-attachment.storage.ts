import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '#/config/env';
import { S3 } from '#/infrastructure/storage/r2';

const MAX_FEEDBACK_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const FEEDBACK_ATTACHMENT_ASSET_BASE_URL = 'https://assets.vornway.com';
const FEEDBACK_ATTACHMENT_FOLDER = 'feedback';
const FEEDBACK_ATTACHMENT_PREFIX = `/${FEEDBACK_ATTACHMENT_FOLDER}/`;

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('La imagen del feedback no es válida');
  }

  const [, , base64] = match;
  return {
    bytes: Buffer.from(base64, 'base64'),
  };
}

export function resolveFeedbackAttachmentUrl(
  attachmentPathOrUrl: string | null | undefined,
) {
  if (!attachmentPathOrUrl) return null;
  if (attachmentPathOrUrl.startsWith('https://')) return attachmentPathOrUrl;
  if (attachmentPathOrUrl.startsWith('/')) {
    return `${FEEDBACK_ATTACHMENT_ASSET_BASE_URL}${attachmentPathOrUrl}`;
  }

  return `${FEEDBACK_ATTACHMENT_ASSET_BASE_URL}/${attachmentPathOrUrl}`;
}

export async function uploadFeedbackAttachment(input: {
  userId: string;
  feedbackId: string;
  index: number;
  dataUrl: string;
}): Promise<string> {
  const { bytes } = parseDataUrl(input.dataUrl);

  if (bytes.byteLength > MAX_FEEDBACK_ATTACHMENT_BYTES) {
    throw new Error('La imagen no puede superar 10 MB');
  }

  const image = new Bun.Image(bytes);
  const compressedBytes = await image
    .resize(1280, 1280, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 80,
    })
    .bytes();

  const key = `${FEEDBACK_ATTACHMENT_FOLDER}/${input.userId}/${input.feedbackId}/attachment-${input.index + 1}.webp`;

  await S3.send(
    new PutObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
      Body: compressedBytes,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `/${key}`;
}

export function isFeedbackAttachmentPath(value: string) {
  return value.startsWith(FEEDBACK_ATTACHMENT_PREFIX);
}

export async function deleteFeedbackAttachment(
  attachmentPathOrUrl: string | null | undefined,
) {
  const key = extractFeedbackAttachmentKey(attachmentPathOrUrl);
  if (!key) return;

  await S3.send(
    new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
    }),
  );
}

function extractFeedbackAttachmentKey(
  attachmentPathOrUrl: string | null | undefined,
) {
  if (!attachmentPathOrUrl) return null;

  try {
    if (attachmentPathOrUrl.startsWith('/')) {
      return attachmentPathOrUrl.startsWith(FEEDBACK_ATTACHMENT_PREFIX)
        ? attachmentPathOrUrl.slice(1)
        : null;
    }

    const url = new URL(attachmentPathOrUrl);
    if (attachmentPathOrUrl.startsWith(FEEDBACK_ATTACHMENT_ASSET_BASE_URL)) {
      return url.pathname.startsWith(FEEDBACK_ATTACHMENT_PREFIX)
        ? url.pathname.slice(1)
        : null;
    }

    return null;
  } catch {
    return null;
  }
}
