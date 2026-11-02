import { useQuery } from '@tanstack/react-query';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export function useNotificationsSummaryQuery() {
  return useQuery({
    queryKey: ['notifications-summary'],
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: () =>
      failWithMessage(
        api.notifications.list.request({ query: { limit: 1 } }),
        m['system.loadNotificationsStatusFailed'](),
      ),
  });
}
