import { useQuery } from '@tanstack/react-query';
import { notificationsClient } from '#/api/notifications';
import type { InferResponseType } from '#/api/types';
import { m } from '#/paraglide/messages.js';

const notificationsEndpoint = notificationsClient.index.$get;
const notificationsMarkReadEndpoint = notificationsClient['read-all'].$post;

type NotificationsResponse = InferResponseType<typeof notificationsEndpoint>;

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsEndpoint({
        query: { limit: '40' },
      });

      if (!response.ok) {
        throw new Error(m['notifications.loadFailed']());
      }

      return (await response.json()) as unknown as NotificationsResponse;
    },
  });
}

export async function markNotificationsAsRead() {
  await notificationsMarkReadEndpoint();
}
