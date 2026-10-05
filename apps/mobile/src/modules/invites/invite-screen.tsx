import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';
import { invitesClient } from '@/api/invites';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Preview = {
  group?: {
    id: string;
    name: string;
    description?: string | null;
    type?: string;
  };
  alreadyMember?: boolean;
  unregisteredMembers?: Array<{ id: string; name: string }>;
};
export default function InviteScreen() {
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const router = useRouter();
  const previewQuery = useQuery({
    queryKey: ['invite-preview', inviteCode],
    enabled: Boolean(inviteCode),
    queryFn: async () => {
      const response = await invitesClient[':inviteCode'].$get({
        param: { inviteCode: inviteCode ?? '' },
      });
      if (!response.ok) throw new Error('invite_load_failed');
      return (await response.json()) as Preview;
    },
  });
  const acceptMutation = useMutation({
    mutationFn: async (memberId?: string) => {
      const response = await invitesClient[':inviteCode'].accept.$post({
        param: { inviteCode: inviteCode ?? '' },
        json: memberId ? { memberId } : {},
      });
      if (!response.ok) throw new Error('invite_accept_failed');
      return response.json() as Promise<{ groupId?: string }>;
    },
    onSuccess: (result) => {
      if (result.groupId) router.replace(`/groups/${result.groupId}` as never);
      else router.back();
    },
  });
  const preview = previewQuery.data;
  return (
    <Screen>
      <ScreenHeader title="Invitación" onBack={() => router.back()} />
      {previewQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : !preview?.group ? (
        <Card style={styles.empty}>
          <Text style={styles.title}>Invitación no disponible</Text>
          <Text style={styles.copy}>El enlace puede haber expirado.</Text>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.title}>
            {preview.alreadyMember
              ? 'Ya eres parte de este espacio'
              : `Únete a ${preview.group.name}`}
          </Text>
          <Text style={styles.copy}>
            {preview.group.description || 'Organiza el viaje junto a tu grupo.'}
          </Text>
          {preview.alreadyMember ? (
            <Button
              onPress={() =>
                router.replace(`/groups/${preview.group?.id}` as never)
              }
            >
              <Text style={styles.buttonText}>Abrir espacio</Text>
            </Button>
          ) : (
            <>
              <Button
                disabled={acceptMutation.isPending}
                onPress={() =>
                  acceptMutation.mutate(undefined, {
                    onError: () =>
                      Alert.alert('No se pudo aceptar', 'Intenta nuevamente.'),
                  })
                }
              >
                <Text style={styles.buttonText}>
                  Unirme como nuevo participante
                </Text>
              </Button>
              {preview.unregisteredMembers?.map((member) => (
                <Button
                  key={member.id}
                  variant="outline"
                  disabled={acceptMutation.isPending}
                  onPress={() =>
                    acceptMutation.mutate(member.id, {
                      onError: () =>
                        Alert.alert(
                          'No se pudo aceptar',
                          'Intenta nuevamente.',
                        ),
                    })
                  }
                >
                  <Text style={styles.outlineText}>Soy {member.name}</Text>
                </Button>
              ))}
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 14, margin: 16, padding: 20 },
  empty: { alignItems: 'center', gap: 8, margin: 16, padding: 24 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
