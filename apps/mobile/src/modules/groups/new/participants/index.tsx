import { useMutation, useQuery } from '@tanstack/react-query';
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

type Participant = { name: string; userId?: string };

export default function GroupCreateParticipantsScreen() {
  const { name, type, description } = useLocalSearchParams<{
    name: string;
    type: 'trip' | 'personal';
    description?: string;
  }>();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const searchQuery = useQuery({
    queryKey: ['group-create-user-search', input.trim()],
    enabled: input.trim().length > 1,
    queryFn: async () => {
      const response = await usersClient.search.$get({
        query: { query: input.trim() },
      });
      if (!response.ok) throw new Error('search_failed');
      return response.json() as Promise<{
        data: Array<{ id: string; name: string; username?: string | null }>;
      }>;
    },
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name?.trim() || !type?.trim()) throw new Error('invalid');
      const response = await groupsClient.index.$post({
        json: {
          name: name.trim(),
          type,
          ...(description?.trim() ? { description: description.trim() } : {}),
          participants,
        },
      });
      if (!response.ok) throw new Error('create_failed');
      return response.json();
    },
    onSuccess: (group) => {
      router.replace(`/groups/${group.id}` as never);
    },
  });
  function addParticipant(participant: Participant) {
    const normalized = participant.name.trim().toLocaleLowerCase('es-CO');
    if (
      !normalized ||
      participants.some(
        (current) =>
          (participant.userId && current.userId === participant.userId) ||
          current.name.trim().toLocaleLowerCase('es-CO') === normalized,
      )
    )
      return;
    setParticipants((current) => [...current, participant]);
    setInput('');
  }
  return (
    <Screen>
      <ScreenHeader title="Participantes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>{name || 'Nuevo espacio'}</Text>
          <Text style={styles.copy}>
            Agrega personas manualmente o vincula usuarios de Vornway.
          </Text>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Nombre o usuario"
          />
          <Button
            variant="outline"
            disabled={!input.trim()}
            onPress={() => addParticipant({ name: input.trim() })}
          >
            <Text style={styles.outlineText}>Agregar manualmente</Text>
          </Button>
          {searchQuery.data?.data?.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              onPress={() =>
                addParticipant({ name: user.name, userId: user.id })
              }
            >
              <Text style={styles.outlineText}>
                {user.name}
                {user.username ? ` · @${user.username}` : ''}
              </Text>
            </Button>
          ))}
          {participants.map((participant) => (
            <Button
              key={participant.userId ?? participant.name}
              variant="ghost"
              onPress={() =>
                setParticipants((current) =>
                  current.filter((item) => item !== participant),
                )
              }
            >
              <Text style={styles.copy}>✓ {participant.name} · Quitar</Text>
            </Button>
          ))}
          <Button
            disabled={createMutation.isPending}
            onPress={() =>
              createMutation.mutate(undefined, {
                onError: () =>
                  Alert.alert('No se pudo crear', 'Intenta nuevamente.'),
              })
            }
          >
            {createMutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear espacio</Text>
            )}
          </Button>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 152 },
  card: { gap: 12, padding: 18 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
