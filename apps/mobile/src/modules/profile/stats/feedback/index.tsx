import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adminClient } from '@/api/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';

type Item = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string | null;
  metadata?: { attachments?: Array<{ url: string }> };
  createdAt?: string;
  user: { name: string; email: string };
};
const statuses = ['OPEN', 'IN_REVIEW', 'PLANNED', 'DONE', 'REJECTED'];
const statusLabels: Record<string, string> = {
  OPEN: 'Abierto',
  IN_REVIEW: 'En revisión',
  PLANNED: 'Planeado',
  DONE: 'Completado',
  REJECTED: 'Rechazado',
};

export default function AdminFeedbackScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const email = (
    session as { user?: { email?: string | null } } | null
  )?.user?.email
    ?.trim()
    .toLowerCase();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [priority, setPriority] = useState('');
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
    mutationFn: async (input: {
      item: Item;
      status?: string;
      priority?: string | null;
    }) => {
      const response = await adminClient.feedback[':feedbackId'].$patch({
        param: { feedbackId: input.item.id },
        json: {
          ...(input.status ? { status: input.status as never } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
      });
      if (!response.ok) throw new Error('feedback_update_failed');
      return (await response.json()) as Item;
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
      setSelectedItem(updated);
      setPriority(updated.priority ?? '');
    },
  });
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Button
            variant="ghost"
            size="icon"
            onPress={() => router.replace('/profile/stats' as never)}
          >
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
            <Button
              style={styles.button}
              onPress={() => router.replace('/profile' as never)}
            >
              <Text style={styles.buttonText}>Volver al perfil</Text>
            </Button>
          </Card>
        ) : feedbackQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : feedbackQuery.isError ? (
          <Card style={styles.card}>
            <Text style={styles.copy}>
              No se pudo cargar la bandeja de feedback.
            </Text>
            <Button onPress={() => void feedbackQuery.refetch()}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : (feedbackQuery.data ?? []).length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.copy}>Aún no hay feedback registrado.</Text>
          </Card>
        ) : (
          <>
            <Card style={styles.summary}>
              <Text style={styles.copy}>Resumen de feedback</Text>
              <View style={styles.summaryRow}>
                {statuses.map((status) => (
                  <View key={status} style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>
                      {
                        (feedbackQuery.data ?? []).filter(
                          (item) => item.status === status,
                        ).length
                      }
                    </Text>
                    <Text style={styles.summaryLabel}>
                      {statusLabels[status] ?? status}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
            {(feedbackQuery.data ?? []).map((item) => (
              <Card key={item.id} style={styles.card}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.copy}>
                  {item.user.name} · {item.user.email} · {item.type}
                </Text>
                <Text style={styles.description}>{item.description}</Text>
                {item.createdAt ? (
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                ) : null}
                {item.priority ? (
                  <Text style={styles.priority}>
                    Prioridad: {item.priority}
                  </Text>
                ) : null}
                {item.metadata?.attachments?.length ? (
                  <ScrollView
                    horizontal
                    contentContainerStyle={styles.attachments}
                  >
                    {item.metadata.attachments.map((attachment) => (
                      <Image
                        key={attachment.url}
                        source={{ uri: attachment.url }}
                        style={styles.attachment}
                        contentFit="cover"
                      />
                    ))}
                  </ScrollView>
                ) : null}
                <View style={styles.statusOptions}>
                  {statuses.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={item.status === status ? 'default' : 'outline'}
                      disabled={updateMutation.isPending}
                      onPress={() =>
                        updateMutation.mutate(
                          { item, status },
                          {
                            onError: () =>
                              Alert.alert(
                                'Error',
                                'No se pudo actualizar el feedback.',
                              ),
                          },
                        )
                      }
                    >
                      <Badge
                        variant="secondary"
                        style={
                          item.status === status
                            ? styles.statusTextActive
                            : styles.statusText
                        }
                      >
                        {statusLabels[status] ?? status}
                      </Badge>
                    </Button>
                  ))}
                </View>
                <Button
                  variant="outline"
                  onPress={() => {
                    setSelectedItem(item);
                    setPriority(item.priority ?? '');
                  }}
                >
                  <Text style={styles.outlineText}>Administrar prioridad</Text>
                </Button>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administrar feedback</DialogTitle>
            <DialogDescription>
              Actualiza la prioridad de este reporte.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={priority}
            onChangeText={setPriority}
            placeholder="Prioridad"
          />
          <DialogFooter>
            <Button
              disabled={!selectedItem || updateMutation.isPending}
              onPress={() => {
                if (!selectedItem) return;
                updateMutation.mutate({
                  item: selectedItem,
                  priority: priority.trim() || null,
                });
              }}
            >
              <Text style={styles.buttonText}>
                {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  date: { color: '#94A3B8', fontSize: 12 },
  priority: { color: '#C2410C', fontSize: 13, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  attachments: { gap: 8, paddingVertical: 4 },
  attachment: { width: 80, height: 80, borderRadius: 16 },
  status: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: '#FFF0F4',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: { color: '#DE034D', fontSize: 12, fontWeight: '600' },
  statusTextActive: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  button: {
    alignItems: 'center',
    backgroundColor: '#DE034D',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
  },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summary: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryItem: { flex: 1, minWidth: 58 },
  summaryValue: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  summaryLabel: { color: '#64748B', fontSize: 10 },
  emptyCard: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 22,
  },
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
