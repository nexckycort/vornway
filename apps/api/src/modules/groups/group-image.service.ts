import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { env } from '~/config/env';
import { S3 } from '~/infrastructure/storage/r2';

const MAX_GROUP_IMAGE_BYTES = 3 * 1024 * 1024;
export const GROUP_IMAGE_ASSET_BASE_URL = 'https://assets.vornway.com';
export const GROUP_IMAGE_ASSET_FOLDER = 'groups';
export const GROUP_IMAGE_ASSET_FILENAME = 'cover.webp';
const GROUP_IMAGE_ASSET_PREFIX = `/${GROUP_IMAGE_ASSET_FOLDER}/`;

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('La imagen del grupo no es válida');
  }

  const [, , base64] = match;
  return {
    bytes: Buffer.from(base64, 'base64'),
  };
}

export async function uploadGroupImage(input: {
  groupId: string;
  dataUrl: string;
}): Promise<string> {
  const { bytes } = parseDataUrl(input.dataUrl);

  if (bytes.byteLength > MAX_GROUP_IMAGE_BYTES) {
    throw new Error('La imagen no puede superar 3 MB');
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

  const key = `${GROUP_IMAGE_ASSET_FOLDER}/${input.groupId}/${GROUP_IMAGE_ASSET_FILENAME}`;

  await S3.send(
    new PutObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
      Body: compressedBytes,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `${GROUP_IMAGE_ASSET_BASE_URL}/${key}`;
}

export async function deleteGroupImage(imageUrl: string | null | undefined) {
  const key = extractGroupImageKey(imageUrl);
  if (!key) return;

  await S3.send(
    new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
    }),
  );
}

function extractGroupImageKey(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    if (imageUrl.startsWith(GROUP_IMAGE_ASSET_BASE_URL)) {
      return url.pathname.startsWith(GROUP_IMAGE_ASSET_PREFIX)
        ? url.pathname.slice(1)
        : null;
    }

    if (url.pathname.startsWith('/api/media/')) {
      return url.pathname.slice('/api/media/'.length);
    }

    return null;
  } catch {
    return null;
  }
}
