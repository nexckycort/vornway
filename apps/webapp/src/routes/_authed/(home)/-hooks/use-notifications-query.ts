import { useQuery } from '@tanstack/react-query';
import { client, type InferResponseType } from '#/lib/hc';

const notificationsEndpoint = client.api.notifications.$get;
const notificationsMarkReadEndpoint =
  client.api.notifications['read-all'].$post;

type NotificationsResponse = InferResponseType<typeof notificationsEndpoint>;

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsEndpoint({
        query: { limit: '40' },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar las notificaciones');
      }

      return (await response.json()) as unknown as NotificationsResponse;
    },
  });
}

export async function markNotificationsAsRead() {
  await notificationsMarkReadEndpoint();
}
