import { hc } from 'hono/client';
import type { MediaRpc } from '#/routes/public/media/routes';

export type { MediaRpc };

const mediaClient = hc<MediaRpc>('');
export type MediaClient = typeof mediaClient;

export const createMediaClient = (
  ...args: Parameters<typeof hc>
): MediaClient => hc<MediaRpc>(...args);
