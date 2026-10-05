import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminClient } from '@/api/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
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
  const queryClient = useQueryClient();
  const feedbackQuery = useQuery({
    queryKey: ['admin-feedback'],
    enabled: email === 'junior110120@gmail.com',
    queryFn: async () => {
      const response = await adminClient.feedback.$get({
        query: { limit: '50' },
      });
      if (!response.ok) throw new Error('feedback_load_failed');
      return ((await response.json()) as { data: Item[] }).data;
    },
  });
  const updateMutation = useMutation({
    mutationFn: async (item: Item) => {
      const next =
        statuses[(statuses.indexOf(item.status) + 1) % statuses.length] ??
        'OPEN';
      const response = await adminClient.feedback[':feedbackId'].$patch({
        param: { feedbackId: item.id },
        json: { status: next as never },
      });
      if (!response.ok) throw new Error('feedback_update_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
    },
  });
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <Text style={styles.back}>‹</Text>
          </Button>
          <Text style={styles.title}>Bandeja de feedback</Text>
          <View style={{ width: 24 }} />
        </View>
        {email !== 'junior110120@gmail.com' ? (
          <Card style={styles.card}>
            <Text style={styles.title}>Sin acceso</Text>
            <Text style={styles.copy}>
              No tienes permisos para ver esta bandeja.
            </Text>
          </Card>
        ) : feedbackQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : (
          (feedbackQuery.data ?? []).map((item) => (
            <Card key={item.id} style={styles.card}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.copy}>
                {item.user.name} · {item.type}
              </Text>
              <Text style={styles.description}>{item.description}</Text>
              <Button
                disabled={updateMutation.isPending}
                onPress={() =>
                  updateMutation.mutate(item, {
                    onError: () =>
                      Alert.alert(
                        'Error',
                        'No se pudo actualizar el feedback.',
                      ),
                  })
                }
                style={styles.status}
              >
                <Badge variant="secondary" style={styles.statusText}>
                  {item.status} · tocar para cambiar
                </Badge>
              </Button>
            </Card>
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
