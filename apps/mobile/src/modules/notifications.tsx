import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { notificationsClient } from '@/api/notifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  url?: string | null;
  actorName?: string | null;
  actorImage?: string | null;
  type?: string;
};

function relativeDate(
  value: string,
  t: (
    key: 'notifications.minutesAgo' | 'notifications.hoursAgo',
    values: { count: number },
  ) => string,
) {
  const minutes = Math.floor(
    Math.max(0, Date.now() - new Date(value).getTime()) / 60000,
  );
  if (minutes < 60)
    return t('notifications.minutesAgo', { count: Math.max(1, minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function groupNotifications(
  items: Notification[],
  t: (
    key:
      | 'notifications.today'
      | 'notifications.thisMonth'
      | 'notifications.oneMonthAgo',
  ) => string,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return [
    {
      label: t('notifications.today'),
      items: items.filter((item) => new Date(item.createdAt) >= today),
    },
    {
      label: t('notifications.thisMonth'),
      items: items.filter((item) => {
        const date = new Date(item.createdAt);
        return date < today && date >= monthAgo;
      }),
    },
    {
      label: t('notifications.oneMonthAgo'),
      items: items.filter((item) => new Date(item.createdAt) < monthAgo),
    },
  ].filter((group) => group.items.length > 0);
}
function notificationGlyph(type?: string) {
  return type === 'expense.created' ? '＋' : '↻';
}
export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications'],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const response = await notificationsClient.index.$get({
        query: { limit: '50', ...(pageParam ? { cursor: pageParam } : {}) },
      });
      if (!response.ok) throw new Error('notifications_load_failed');
      return (await response.json()) as {
        data: Notification[];
        pagination?: { nextCursor?: string | null };
      };
    },
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
  });
  useEffect(
    () => () => {
      void notificationsClient['read-all'].$post().finally(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      });
    },
    [queryClient],
  );
  const items =
    notificationsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const groups = groupNotifications(items, t);
  return (
    <Screen>
      <ScreenHeader
        title={t('notifications.title')}
        onBack={() => router.replace('/(tabs)' as never)}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 160 &&
            notificationsQuery.hasNextPage &&
            !notificationsQuery.isFetchingNextPage
          ) {
            void notificationsQuery.fetchNextPage();
          }
        }}
      >
        {notificationsQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : notificationsQuery.isError ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>{t('notifications.loadFailed')}</Text>
            <Button onPress={() => void notificationsQuery.refetch()}>
              <Text style={styles.buttonText}>{t('common.retry')}</Text>
            </Button>
          </Card>
        ) : groups.length === 0 ? (
          <Card style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="notifications-outline"
                size={25}
                color="#FF4D6A"
              />
            </View>
            <Text style={styles.title}>{t('notifications.emptyTitle')}</Text>
            <Text style={styles.copy}>{t('notifications.emptyCopy')}</Text>
          </Card>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.groupTitle}>{group.label}</Text>
              {group.items.map((item) => (
                <Button
                  key={item.id}
                  variant="ghost"
                  style={[styles.card, !item.readAt && styles.unread]}
                  onPress={() => {
                    if (item.url) router.push(item.url as never);
                  }}
                >
                  {item.actorImage ? (
                    <Image
                      source={{ uri: item.actorImage }}
                      style={styles.avatar}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {notificationGlyph(item.type)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.copyWrap}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.copy}>{item.body}</Text>
                    <Text style={styles.date}>
                      {relativeDate(item.createdAt, t)}
                    </Text>
                  </View>
                  {!item.readAt ? <View style={styles.dot} /> : null}
                </Button>
              ))}
            </View>
          ))
        )}
        {notificationsQuery.isFetchingNextPage ? (
          <Spinner color="#DE034D" />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  group: { gap: 8 },
  groupTitle: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  card: { alignItems: 'center', gap: 8, padding: 16 },
  unread: { backgroundColor: '#FFF7F9' },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#FFF1F5',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: { color: '#DE034D', fontSize: 17, fontWeight: '700' },
  copyWrap: { flex: 1, gap: 3 },
  dot: { backgroundColor: '#EF4444', borderRadius: 5, height: 9, width: 9 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#FFF1F5',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 4,
    width: 56,
  },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  date: { color: '#94A3B8', fontSize: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
