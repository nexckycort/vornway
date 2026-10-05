import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { notificationsClient } from '@/api/notifications';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};
export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);
  useEffect(() => {
    void notificationsClient.index
      .$get({ query: { limit: '50' } })
      .then(async (response) => {
        if (response.ok)
          setItems(((await response.json()) as { data: Notification[] }).data);
      });
    return () => {
      void notificationsClient['read-all'].$post();
    };
  }, []);
  return (
    <Screen>
      <ScreenHeader title="Notificaciones" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {items === null ? (
          <Spinner color="#DE034D" />
        ) : items.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No tienes notificaciones</Text>
            <Text style={styles.copy}>
              Aquí verás actualizaciones de tus espacios y gastos.
            </Text>
          </Card>
        ) : (
          items.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.copy}>{item.body}</Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString('es-CO')}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  card: { gap: 8, padding: 16 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  date: { color: '#94A3B8', fontSize: 12 },
});
