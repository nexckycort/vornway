import { useQuery } from '@tanstack/react-query';
import { client } from '#/lib/hc';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  groupId: string | null;
  expenseId: string | null;
  actorName: string | null;
  actorImage: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  data: NotificationItem[];
  pagination: {
    limit: number;
    total: number;
    nextCursor: string | null;
  };
};

const notificationsEndpoint = client.api.notifications.$get;

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsEndpoint({
        query: { limit: '40', markAsRead: 'true' },
      });

      if (!response.ok) {
        throw new Error('No se pudieron cargar las notificaciones');
      }

      return (await response.json()) as NotificationsResponse;
    },
  });
}
