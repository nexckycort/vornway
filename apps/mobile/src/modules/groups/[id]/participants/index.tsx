import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { usersClient } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Member = {
  id: string;
  name: string;
  user?: { name?: string | null } | null;
};
type SearchUser = {
  id: string;
  name: string;
  email?: string;
  username?: string | null;
};

export default function GroupParticipantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const membersQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el espacio');
      return response.json();
    },
  });
  const usersQuery = useQuery({
    queryKey: ['user-search', search.trim()],
    enabled: search.trim().length > 1,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: search.trim() },
      });
      if (!response.ok) throw new Error('No se pudo buscar usuarios');
      return response.json() as Promise<{ data: SearchUser[] }>;
    },
  });
  const addMutation = useMutation({
    mutationFn: async (participant: {
      name: string;
      linkedUserId?: string;
    }) => {
      const response = await groupsClient[':id'].members.$post({
        param: { id: id ?? '' },
        json: participant,
      });
      if (!response.ok) throw new Error('No se pudo agregar');
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
  });
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await groupsClient[':id'].members[':memberId'].$delete({
        param: { id: id ?? '', memberId },
      });
      if (!response.ok) throw new Error('No se pudo eliminar');
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
  });
  const members =
    membersQuery.data && 'members' in membersQuery.data
      ? (membersQuery.data.members as Member[])
      : [];
  function addManual() {
    if (!name.trim() || addMutation.isPending) return;
    addMutation.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          setName('');
        },
        onError: () => Alert.alert('No se pudo agregar', 'Intenta nuevamente.'),
      },
    );
  }
  return (
    <Screen>
      <ScreenHeader title="Participantes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {membersQuery.isLoading ? <Spinner color="#DE034D" /> : null}
        <Card style={styles.form}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Nombre del participante"
          />
          <Button onPress={addManual}>
            <Text style={styles.buttonText}>Agregar participante</Text>
          </Button>
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar usuario para vincular"
          />
          {usersQuery.data?.data?.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              onPress={() =>
                addMutation.mutate({ name: user.name, linkedUserId: user.id })
              }
            >
              <Text style={styles.outlineText}>
                {user.name}
                {user.username ? ` · @${user.username}` : ''}
              </Text>
            </Button>
          ))}
        </Card>
        {members.map((member) => (
          <Card key={member.id} style={styles.row}>
            <Text style={styles.name}>{member.user?.name || member.name}</Text>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => removeMutation.mutate(member.id)}
            >
              <Text style={styles.remove}>Eliminar</Text>
            </Button>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  form: { gap: 12, padding: 16 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  name: { color: '#0F172A', flex: 1, fontSize: 15, fontWeight: '600' },
  remove: { color: '#B91C1C', fontSize: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
