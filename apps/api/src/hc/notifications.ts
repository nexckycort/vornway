import { hc } from 'hono/client';
import type { NotificationsRpc } from '#/routes/authed/notifications/routes';

export type { NotificationsRpc };

const notificationsClient = hc<NotificationsRpc>('');
export type NotificationsClient = typeof notificationsClient;

export const createNotificationsClient = (
  ...args: Parameters<typeof hc>
): NotificationsClient => hc<NotificationsRpc>(...args);
