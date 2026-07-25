import { useEffect, useSyncExternalStore } from 'react';
import { updateAppBadge } from '#/lib/app-badge';
import {
  getPendingExpensesCount,
  subscribePendingExpenses,
} from '#/lib/offline-expense-query-collection';
import {
  getPendingGroupsCount,
  subscribePendingGroups,
} from '#/lib/offline-group-query-collection';
import { useNotificationsSummaryQuery } from '#/routes/_authed/(home)/-hooks/use-notifications-summary-query';

export function AppBadgeSync() {
  const notifications = useNotificationsSummaryQuery();
  const pendingExpenses = useSyncExternalStore(
    subscribePendingExpenses,
    getPendingExpensesCount,
    () => 0,
  );
  const pendingGroups = useSyncExternalStore(
    subscribePendingGroups,
    getPendingGroupsCount,
    () => 0,
  );
  const badgeCount =
    (notifications.data?.unreadCount ?? 0) + pendingExpenses + pendingGroups;

  useEffect(() => {
    void updateAppBadge(badgeCount);
  }, [badgeCount]);

  useEffect(
    () => () => {
      void updateAppBadge(0);
    },
    [],
  );

  return null;
}
