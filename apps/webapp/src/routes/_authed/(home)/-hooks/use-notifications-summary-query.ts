import { useQuery } from '@tanstack/react-query';
import { client } from '#/lib/hc';

type NotificationsSummaryResponse = {
  data: unknown[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
  unreadCount: number;
};

const notificationsEndpoint = client.api.notifications.$get;

export function useNotificationsSummaryQuery() {
  return useQuery({
    queryKey: ['notifications-summary'],
    queryFn: async () => {
      const response = await notificationsEndpoint({
        query: { limit: '1', markAsRead: 'false' },
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar el estado de notificaciones');
      }

      return (await response.json()) as unknown as NotificationsSummaryResponse;
    },
  });
}
