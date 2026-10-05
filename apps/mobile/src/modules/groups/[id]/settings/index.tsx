import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/auth-client';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showQr, setShowQr] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { data: session } = authClient.useSession();
  const userEmail = (session as { user?: { email?: string | null } } | null)
    ?.user?.email;
  const canManageAdvancedDetails =
    userEmail?.trim().toLowerCase() === 'junior110120@gmail.com';
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('load_failed');
      return response.json();
    },
  });
  const group =
    groupQuery.data && 'advancedExpenseDetailsEnabled' in groupQuery.data
      ? groupQuery.data
      : null;
  const mutation = useMutation({
    mutationFn: async (value: boolean) => {
      const response = await groupsClient[':id'].settings.$patch({
        param: { id: id ?? '' },
        json: { advancedExpenseDetailsEnabled: value },
      });
      if (!response.ok) throw new Error('save_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await groupsClient[':id'].$delete({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('delete_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
      ]);
      router.replace('/spaces' as never);
    },
  });
  const leaveMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await groupsClient[':id'].members[':memberId'].$delete({
        param: { id: id ?? '', memberId },
      });
      if (!response.ok) throw new Error('leave_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['groups-list'] }),
      ]);
      router.replace('/spaces' as never);
    },
  });
  async function shareInvite() {
    if (!group?.inviteCode) return;
    await Share.share({
      message: `Únete a ${group.name} en Vornway: https://join.vornway.com/${group.inviteCode}`,
    });
  }
  async function exportCsv() {
    if (!id || isExporting) return;
    setIsExporting(true);
    try {
      const response = await groupsClient[':id'].export.$get({
        param: { id },
      });
      if (!response.ok) throw new Error('export_failed');
      const csv = await response.text();
      await Share.share({
        title: `Exportación de ${group?.name ?? 'espacio'}`,
        message: csv,
      });
    } catch {
      Alert.alert('No se pudo exportar', 'Intenta nuevamente.');
    } finally {
      setIsExporting(false);
    }
  }
  return (
    <Screen>
      <ScreenHeader
        title="Configuración"
        onBack={() => router.replace(`/groups/${id}` as never)}
      />
      {groupQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : groupQuery.isError || !group ? (
        <Card style={styles.empty}>
          <Text style={styles.description}>
            No pudimos cargar la configuración.
          </Text>
          <Button onPress={() => void groupQuery.refetch()}>
            <Text style={styles.actionText}>Reintentar</Text>
          </Button>
        </Card>
      ) : (
        <View style={styles.content}>
          {canManageAdvancedDetails ? (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.title}>Detalles avanzados</Text>
                  <Text style={styles.description}>
                    Permite registrar categorías y detalles adicionales en los
                    gastos.
                  </Text>
                </View>
                <Switch
                  value={group?.advancedExpenseDetailsEnabled ?? false}
                  onValueChange={(value) => mutation.mutate(value)}
                  trackColor={{ false: '#CBD5E1', true: '#F7A0BA' }}
                  thumbColor={
                    group?.advancedExpenseDetailsEnabled ? '#DE034D' : '#FFFFFF'
                  }
                />
              </View>
            </Card>
          ) : null}
          <Card style={styles.actions}>
            <Button
              variant="outline"
              onPress={() => setShowQr(true)}
              disabled={!group?.inviteCode}
            >
              <Text style={styles.actionText}>Mostrar código QR</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() => router.push(`/groups/${id}/edit` as never)}
            >
              <Text style={styles.actionText}>Editar espacio</Text>
            </Button>
            <Button
              variant="outline"
              onPress={() =>
                router.push(`/groups/${id}/settings/categories` as never)
              }
            >
              <Text style={styles.actionText}>Administrar categorías</Text>
            </Button>
            <Button
              variant="outline"
              disabled={isExporting}
              onPress={() => void exportCsv()}
            >
              <Text style={styles.actionText}>
                {isExporting ? 'Exportando…' : 'Exportar gastos (CSV)'}
              </Text>
            </Button>
            <Button variant="outline" onPress={() => void shareInvite()}>
              <Text style={styles.actionText}>Compartir invitación</Text>
            </Button>
          </Card>
          {group?.isOwner ? (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onPress={() =>
                Alert.alert(
                  'Eliminar espacio',
                  'Esta acción no se puede deshacer.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate(),
                    },
                  ],
                )
              }
            >
              <Text style={styles.dangerText}>Eliminar espacio</Text>
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={leaveMutation.isPending || !group?.myMembership?.id}
              onPress={() =>
                Alert.alert(
                  'Abandonar espacio',
                  '¿Quieres abandonar este espacio?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Abandonar',
                      style: 'destructive',
                      onPress: () =>
                        group?.myMembership?.id &&
                        leaveMutation.mutate(group.myMembership.id),
                    },
                  ],
                )
              }
            >
              <Text style={styles.dangerText}>Abandonar espacio</Text>
            </Button>
          )}
        </View>
      )}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código QR de invitación</DialogTitle>
            <DialogDescription>
              Escanéalo para unirte a {group?.name ?? 'este espacio'}.
            </DialogDescription>
          </DialogHeader>
          {group?.inviteCode ? (
            <Image
              style={styles.qr}
              accessibilityLabel="Código QR de invitación"
              source={{
                uri: `https://quickchart.io/qr?size=420&text=${encodeURIComponent(
                  `https://join.vornway.com/${group.inviteCode}`,
                )}`,
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  card: { margin: 16, padding: 18 },
  actions: { gap: 10, padding: 16 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  copy: { flex: 1, gap: 6 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  actionText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  dangerText: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
  qr: { alignSelf: 'center', height: 280, width: 280 },
  empty: { gap: 12, margin: 16, padding: 20 },
});
