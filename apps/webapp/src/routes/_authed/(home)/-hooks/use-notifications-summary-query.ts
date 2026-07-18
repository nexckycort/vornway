import { useQuery } from '@tanstack/react-query';
import { notificationsClient } from '#/api/notifications';

type NotificationsSummaryResponse = {
  data: unknown[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
  unreadCount: number;
};

const notificationsEndpoint = notificationsClient.index.$get;

export function useNotificationsSummaryQuery() {
  return useQuery({
    queryKey: ['notifications-summary'],
    queryFn: async () => {
      const response = await notificationsEndpoint({
        query: { limit: '1' },
      });

      if (!response.ok) {
        throw new Error('No se pudo cargar el estado de notificaciones');
      }

      return (await response.json()) as unknown as NotificationsSummaryResponse;
    },
  });
}
