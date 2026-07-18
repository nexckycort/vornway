import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BellRing, Plus, RefreshCcw } from 'lucide-react';
import { useEffect } from 'react';
import { MobilePageLayout } from '#/components/mobile-page-layout';
import { m } from '#/paraglide/messages.js';
import {
  markNotificationsAsRead,
  useNotificationsQuery,
} from '#/routes/_authed/(home)/-hooks/use-notifications-query';

export const Route = createFileRoute('/_authed/notifications')({
  component: RouteComponent,
});

type NotificationGroup = {
  label: string;
  items: Array<{
    id: string;
    title: string;
    body: string;
    url: string;
    createdAt: string;
    readAt: string | null;
    actorName: string | null;
    actorImage: string | null;
    type: string;
  }>;
};

const relativeDateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatRelativeTime(isoDate: string): string {
  const createdAt = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - createdAt);
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 60) {
    return m['notifications.minutesAgo']({ count: Math.max(1, diffMin) });
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return m['notifications.hoursAgo']({ count: diffHours });
  }

  return relativeDateFormatter.format(new Date(isoDate));
}

function groupNotifications(
  notifications: NotificationGroup['items'],
): NotificationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  const groups = notifications.reduce((acc, item) => {
    const createdAt = new Date(item.createdAt);
    const label =
      createdAt >= today
        ? m['notifications.today']()
        : createdAt >= oneMonthAgo
          ? m['notifications.thisMonth']()
          : m['notifications.oneMonthAgo']();

    (acc.get(label) ?? acc.set(label, []).get(label)!).push(item);
    return acc;
  }, new Map<string, NotificationGroup['items']>());

  const orderedGroups: NotificationGroup[] = [];
  for (const label of [
    m['notifications.today'](),
    m['notifications.thisMonth'](),
    m['notifications.oneMonthAgo'](),
  ]) {
    const items = groups.get(label) ?? [];
    if (items.length === 0) continue;
    orderedGroups.push({ label, items });
  }

  return orderedGroups;
}

function NotificationIcon({
  type,
  actorName,
  actorImage,
}: {
  type: string;
  actorName: string | null;
  actorImage: string | null;
}) {
  if (actorImage) {
    return (
      <img
        src={actorImage}
        alt={actorName ?? m['notifications.inviteAlt']()}
        className="size-12 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  const baseClass =
    'flex size-12 items-center justify-center rounded-full bg-[#fff1f5] text-[#ff4d6a]';

  if (type === 'expense.created') {
    return (
      <span className={baseClass}>
        <Plus className="size-5" />
      </span>
    );
  }

  return (
    <span className={baseClass}>
      <RefreshCcw className="size-5" />
    </span>
  );
}

function RouteComponent() {
  const navigate = useNavigate();
  const notificationsQuery = useNotificationsQuery();

  const notifications = notificationsQuery.data?.data ?? [];
  const grouped = groupNotifications(notifications);

  useEffect(() => {
    return () => {
      void markNotificationsAsRead();
    };
  }, []);

  return (
    <MobilePageLayout
      title={m['notifications.title']()}
      onBack={() => navigate({ to: '/', replace: true })}
    >
      <div className="-mx-1 flex flex-1 flex-col overflow-y-auto px-1 pb-4 pt-2">
        {notificationsQuery.isLoading ? (
          <p className="px-3 py-6 text-sm text-[#64748b]">
            {m['notifications.loading']()}
          </p>
        ) : null}

        {notificationsQuery.isError ? (
          <div className="mx-3 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {notificationsQuery.error instanceof Error
              ? notificationsQuery.error.message
              : m['notifications.loadFailed']()}
          </div>
        ) : null}

        {!notificationsQuery.isLoading &&
        !notificationsQuery.isError &&
        grouped.length === 0 ? (
          <div className="flex min-h-[calc(100dvh-180px)] items-center justify-center px-4 text-center">
            <div className="-mt-10 flex flex-col items-center">
              <span className="mb-3 inline-flex size-14 items-center justify-center rounded-full bg-[#fff1f5] text-[#ff4d6a]">
                <BellRing className="size-6" />
              </span>
              <p className="text-base font-semibold leading-6 text-[#202124]">
                {m['notifications.emptyTitle']()}
              </p>
              <p className="mt-1 max-w-[260px] text-sm leading-5 text-[#64748b]">
                {m['notifications.emptyCopy']()}
              </p>
            </div>
          </div>
        ) : null}

        {grouped.map((group) => (
          <section key={group.label} className="mt-4">
            <p className="px-3 pb-3 text-sm font-medium leading-5 text-[#555555]">
              {group.label}
            </p>
            <div className="divide-y divide-[#ececec] border-y border-[#ececec] bg-transparent">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="block w-full px-3 py-4 text-left transition-colors active:bg-[#f6f6f6]"
                  onClick={() => {
                    if (!item.url) return;
                    window.location.href = item.url;
                  }}
                >
                  <div className="flex items-start gap-3">
                    <NotificationIcon
                      type={item.type}
                      actorImage={item.actorImage}
                      actorName={item.actorName}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold leading-6 text-[#202124]">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm leading-5 text-[#555555]">
                            {item.body}
                          </p>
                        </div>
                        {item.readAt ? null : (
                          <span className="mt-4 inline-flex size-2.5 shrink-0 rounded-full bg-[#ef4444]" />
                        )}
                      </div>
                      <p className="mt-2 text-xs text-[#9ca3af]">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </MobilePageLayout>
  );
}
