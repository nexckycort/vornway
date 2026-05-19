import { PutObjectCommand } from '@aws-sdk/client-s3';

import { env } from '~/config/env';
import { S3 } from '~/infrastructure/storage/r2';

const MAX_GROUP_IMAGE_BYTES = 3 * 1024 * 1024;

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

export async function uploadGroupImage(
  input: {
    groupId: string;
    dataUrl: string;
    mediaBaseUrl: string;
  },
): Promise<string> {
  const { bytes } = parseDataUrl(input.dataUrl);

  if (bytes.byteLength > MAX_GROUP_IMAGE_BYTES) {
    throw new Error('La imagen no puede superar 3 MB');
  }

  const image = new (Bun as any).Image(bytes);
  const compressedBytes = await image
    .resize(640, 640, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({
      quality: 78,
    })
    .bytes();

  const key = `groups/${input.groupId}/cover.webp`;

  await S3.send(
    new PutObjectCommand({
      Bucket: env.CLOUDFLARE_BUCKET_NAME,
      Key: key,
      Body: compressedBytes,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return `${input.mediaBaseUrl}/api/media/groups/${key}`;
}
