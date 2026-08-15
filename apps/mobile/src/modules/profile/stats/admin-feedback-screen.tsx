import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminClient } from '@/api/admin';
import { authClient } from '@/lib/auth-client';

type Item = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string | null;
  user: { name: string; email: string };
};
const statuses = ['OPEN', 'IN_REVIEW', 'PLANNED', 'DONE', 'REJECTED'];

export default function AdminFeedbackScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const email = (
    session as { user?: { email?: string | null } } | null
  )?.user?.email
    ?.trim()
    .toLowerCase();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (email !== 'junior110120@gmail.com') {
      setLoading(false);
      return;
    }
    void adminClient.feedback
      .$get({ query: { limit: '50' } })
      .then(async (response) => {
        if (response.ok)
          setItems(((await response.json()) as { data: Item[] }).data);
        setLoading(false);
      });
  }, [email]);
  async function update(item: Item) {
    const next =
      statuses[(statuses.indexOf(item.status) + 1) % statuses.length] ?? 'OPEN';
    const response = await adminClient.feedback[':feedbackId'].$patch({
      param: { feedbackId: item.id },
      json: { status: next as never },
    });
    if (response.ok)
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, status: next } : entry,
        ),
      );
    else Alert.alert('Error', 'No se pudo actualizar el feedback.');
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Bandeja de feedback</Text>
          <View style={{ width: 24 }} />
        </View>
        {email !== 'junior110120@gmail.com' ? (
          <View style={styles.card}>
            <Text style={styles.title}>Sin acceso</Text>
            <Text style={styles.copy}>
              No tienes permisos para ver esta bandeja.
            </Text>
          </View>
        ) : loading ? (
          <ActivityIndicator color="#DE034D" />
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.copy}>
                {item.user.name} · {item.type}
              </Text>
              <Text style={styles.description}>{item.description}</Text>
              <Pressable
                onPress={() => void update(item)}
                style={styles.status}
              >
                <Text style={styles.statusText}>
                  {item.status} · tocar para cambiar
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 152, gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  back: { color: '#202124', fontSize: 34 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  card: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  itemTitle: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 13, lineHeight: 19 },
  description: { color: '#334155', fontSize: 14, lineHeight: 21 },
  status: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: '#FFF0F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: { color: '#DE034D', fontSize: 12, fontWeight: '600' },
});
