import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

import { env } from '#/config/env';
import { S3 } from '#/infrastructure/storage/r2';

const MAX_USER_IMAGE_BYTES = 10 * 1024 * 1024;
export const USER_IMAGE_ASSET_BASE_URL = 'https://assets.vornway.com';
export const USER_IMAGE_ASSET_FOLDER = 'users';
export const USER_IMAGE_ASSET_FILENAME = 'avatar.webp';
const USER_IMAGE_ASSET_PREFIX = `/${USER_IMAGE_ASSET_FOLDER}/`;

export function resolveUserImageUrl(
  imagePathOrUrl: string | null | undefined,
  updatedAt?: Date | string | null,
) {
  if (!imagePathOrUrl) return null;
  if (
    imagePathOrUrl.startsWith('https://') ||
    imagePathOrUrl.startsWith('data:')
  ) {
    return imagePathOrUrl;
  }

  const resolved = imagePathOrUrl.startsWith('/')
    ? `${USER_IMAGE_ASSET_BASE_URL}${imagePathOrUrl}`
    : `${USER_IMAGE_ASSET_BASE_URL}/${imagePathOrUrl}`;

  const version =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'string'
        ? Date.parse(updatedAt)
        : null;

  if (!version || Number.isNaN(version)) {
    return resolved;
  }

  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}v=${version}`;
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('La imagen del perfil no es válida');
  }

  const [, , base64] = match;
  return {
    bytes: Buffer.from(base64, 'base64'),
  };
}

export async function uploadUserImage(input: {
  userId: string;
  dataUrl: string;
}): Promise<string> {
  const { bytes } = parseDataUrl(input.dataUrl);

  if (bytes.byteLength > MAX_USER_IMAGE_BYTES) {
    throw new Error('La imagen no puede superar 10 MB');
  }

  const image = new Bun.Image(bytes);
  const compressedBytes = await image
    .resize(400, 400, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 78,
    })
    .bytes();

  const key = `${USER_IMAGE_ASSET_FOLDER}/${input.userId}/${USER_IMAGE_ASSET_FILENAME}`;

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

export async function deleteUserImage(imageUrl: string | null | undefined) {
  const key = extractUserImageKey(imageUrl);
  if (!key) return;

  await S3.send(
    new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
    }),
  );
}

function extractUserImageKey(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;

  try {
    if (imageUrl.startsWith('/')) {
      return imageUrl.startsWith(USER_IMAGE_ASSET_PREFIX)
        ? imageUrl.slice(1)
        : null;
    }

    const url = new URL(imageUrl);
    if (imageUrl.startsWith(USER_IMAGE_ASSET_BASE_URL)) {
      return url.pathname.startsWith(USER_IMAGE_ASSET_PREFIX)
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
