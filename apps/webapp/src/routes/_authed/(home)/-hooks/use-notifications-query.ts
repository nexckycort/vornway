import { useQuery } from '@tanstack/react-query';
import { api, failWithMessage } from '#/api/client';
import { m } from '#/paraglide/messages.js';

export function useNotificationsQuery() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      failWithMessage(
        api.notifications.list.request({ query: { limit: 40 } }),
        m['notifications.loadFailed'](),
      ),
  });
}

export async function markNotificationsAsRead() {
  await failWithMessage(
    api.notifications.readAll.request(),
    m['notifications.loadFailed'](),
  );
}
