import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { notificationsClient } from '@/api/notifications';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  url?: string | null;
  actorName?: string | null;
};

function relativeDate(value: string) {
  const minutes = Math.floor(
    Math.max(0, Date.now() - new Date(value).getTime()) / 60000,
  );
  if (minutes < 60) return `Hace ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return new Date(value).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function groupNotifications(items: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  return [
    {
      label: 'Hoy',
      items: items.filter((item) => new Date(item.createdAt) >= today),
    },
    {
      label: 'Este mes',
      items: items.filter((item) => {
        const date = new Date(item.createdAt);
        return date < today && date >= monthAgo;
      }),
    },
    {
      label: 'Anteriores',
      items: items.filter((item) => new Date(item.createdAt) < monthAgo),
    },
  ].filter((group) => group.items.length > 0);
}
export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await notificationsClient.index.$get({
        query: { limit: '50' },
      });
      if (!response.ok) throw new Error('notifications_load_failed');
      return ((await response.json()) as { data: Notification[] }).data;
    },
  });
  useEffect(
    () => () => {
      void notificationsClient['read-all'].$post().finally(() => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });
    },
    [queryClient],
  );
  const items = notificationsQuery.data ?? [];
  const groups = groupNotifications(items);
  return (
    <Screen>
      <ScreenHeader title="Notificaciones" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {notificationsQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : groups.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No tienes notificaciones</Text>
            <Text style={styles.copy}>
              Aquí verás actualizaciones de tus espacios y gastos.
            </Text>
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
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.actorName ?? item.title).slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.copyWrap}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.copy}>{item.body}</Text>
                    <Text style={styles.date}>
                      {relativeDate(item.createdAt)}
                    </Text>
                  </View>
                  {!item.readAt ? <View style={styles.dot} /> : null}
                </Button>
              ))}
            </View>
          ))
        )}
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
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  date: { color: '#94A3B8', fontSize: 12 },
});
