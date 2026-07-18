import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { env } from '#/config/env';
import { GROUP_IMAGE_ASSET_BASE_URL } from '#/infrastructure/storage/group-images';
import { S3 } from '#/infrastructure/storage/r2';

const MAX_EXPENSE_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const EXPENSE_ATTACHMENT_FOLDER = 'groups';
const EXPENSE_ATTACHMENT_FILENAME = 'attachment.webp';
const EXPENSE_ATTACHMENT_PREFIX = `/${EXPENSE_ATTACHMENT_FOLDER}/`;

export function resolveExpenseAttachmentUrl(
  attachmentPathOrUrl: string | null | undefined,
) {
  if (!attachmentPathOrUrl) return null;
  if (attachmentPathOrUrl.startsWith('https://')) return attachmentPathOrUrl;
  if (attachmentPathOrUrl.startsWith('/')) {
    return `${GROUP_IMAGE_ASSET_BASE_URL}${attachmentPathOrUrl}`;
  }

  return `${GROUP_IMAGE_ASSET_BASE_URL}/${attachmentPathOrUrl}`;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('La imagen del gasto no es válida');
  }

  const [, , base64] = match;
  return {
    bytes: Buffer.from(base64, 'base64'),
  };
}

export async function uploadExpenseAttachment(input: {
  groupId: string;
  expenseId: string;
  dataUrl: string;
}): Promise<string> {
  const { bytes } = parseDataUrl(input.dataUrl);

  if (bytes.byteLength > MAX_EXPENSE_ATTACHMENT_BYTES) {
    throw new Error('La imagen no puede superar 10 MB');
  }

  const image = new Bun.Image(bytes);
  const compressedBytes = await image
    .resize(640, 640, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 78,
    })
    .bytes();

  const key = `${EXPENSE_ATTACHMENT_FOLDER}/${input.groupId}/expenses/${input.expenseId}/${EXPENSE_ATTACHMENT_FILENAME}`;

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

export async function deleteExpenseAttachment(
  attachmentPathOrUrl: string | null | undefined,
) {
  const key = extractExpenseAttachmentKey(attachmentPathOrUrl);
  if (!key) return;

  await S3.send(
    new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
    }),
  );
}

function extractExpenseAttachmentKey(
  attachmentPathOrUrl: string | null | undefined,
) {
  if (!attachmentPathOrUrl) return null;

  try {
    if (attachmentPathOrUrl.startsWith('/')) {
      return attachmentPathOrUrl.startsWith(EXPENSE_ATTACHMENT_PREFIX)
        ? attachmentPathOrUrl.slice(1)
        : null;
    }

    const url = new URL(attachmentPathOrUrl);
    if (attachmentPathOrUrl.startsWith(GROUP_IMAGE_ASSET_BASE_URL)) {
      return url.pathname.startsWith(EXPENSE_ATTACHMENT_PREFIX)
        ? url.pathname.slice(1)
        : null;
    }

    return null;
  } catch {
    return null;
  }
}
