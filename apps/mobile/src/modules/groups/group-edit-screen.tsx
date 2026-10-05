import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GroupEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
    groupQuery.data && 'name' in groupQuery.data ? groupQuery.data : null;
  useEffect(() => {
    if (!group) return;
    setName(group.name);
    setDescription(group.description ?? '');
  }, [group]);
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await groupsClient[':id'].$patch({
        param: { id: id ?? '' },
        json: {
          name: name.trim(),
          type: group?.type ?? 'trip',
          description: description.trim() || undefined,
        },
      });
      if (!response.ok) throw new Error('save_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-summary', id] });
      await queryClient.invalidateQueries({ queryKey: ['groups-list'] });
      router.back();
    },
  });
  return (
    <Screen>
      <ScreenHeader title="Editar espacio" onBack={() => router.back()} />
      {groupQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : (
        <Card style={styles.card}>
          <Label>Nombre</Label>
          <Input value={name} onChangeText={setName} />
          <Label>Descripción</Label>
          <Input value={description} onChangeText={setDescription} />
          <Button
            disabled={mutation.isPending || !name.trim()}
            onPress={() =>
              mutation.mutate(undefined, {
                onError: () =>
                  Alert.alert('No se pudo guardar', 'Intenta nuevamente.'),
              })
            }
          >
            {mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar cambios</Text>
            )}
          </Button>
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
