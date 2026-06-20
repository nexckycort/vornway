import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Hono } from 'hono';

import { env } from '#/config/env';
import { S3 } from '#/infrastructure/storage/r2';

const app = new Hono().get('/groups/*', async (c) => {
  const key = c.req.param('*');

  if (!key) {
    return c.json({ error: 'Archivo no encontrado' }, 404);
  }

  try {
    const object = await S3.send(
      new GetObjectCommand({
        Bucket: env.CLOUDFLARE_BUCKET_NAME,
        Key: key,
      }),
    );

    const streamBody = object.Body as
      | {
          transformToByteArray?: () => Promise<Uint8Array>;
          transformToWebStream?: () => ReadableStream<Uint8Array>;
        }
      | undefined;
    let bytes: Uint8Array<ArrayBuffer> = new Uint8Array();

    if (streamBody?.transformToByteArray) {
      bytes =
        (await streamBody.transformToByteArray()) as Uint8Array<ArrayBuffer>;
    } else if (streamBody?.transformToWebStream) {
      const stream = streamBody.transformToWebStream();
      bytes = new Uint8Array(
        await new Response(stream).arrayBuffer(),
      ) as Uint8Array<ArrayBuffer>;
    }

    if (bytes.byteLength === 0) {
      return c.json({ error: 'Archivo no encontrado' }, 404);
    }

    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': object.ContentType ?? 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return c.json({ error: 'Archivo no encontrado' }, 404);
  }
});

export default app;
