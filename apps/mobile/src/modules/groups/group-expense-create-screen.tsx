import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GroupExpenseCreateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const groupQuery = useQuery({
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
  const members =
    groupQuery.data && 'members' in groupQuery.data
      ? groupQuery.data.members
      : [];
  const categories =
    groupQuery.data && 'categories' in groupQuery.data
      ? groupQuery.data.categories
      : [];
  useEffect(() => {
    if (selectedIds.length === 0 && members.length > 0)
      setSelectedIds(members.map((member) => member.id));
  }, [members, selectedIds.length]);
  const mutation = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount.replace(',', '.'));
      if (
        !id ||
        !description.trim() ||
        !Number.isFinite(parsedAmount) ||
        parsedAmount <= 0 ||
        selectedIds.length === 0
      )
        throw new Error('invalid');
      const response = await groupsClient[':id'].expenses.$post({
        param: { id },
        json: {
          description: description.trim(),
          amount: parsedAmount,
          currency: 'COP',
          participantIds: selectedIds,
          splitMethod: 'equal',
          ...(categoryId ? { categoryId } : {}),
        },
      });
      if (!response.ok) throw new Error('failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-expenses', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
      ]);
      router.back();
    },
  });
  return (
    <Screen>
      <ScreenHeader title="Nuevo gasto" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Label>Descripción</Label>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Cena, transporte..."
          />
          <Label>Monto</Label>
          <Input
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Label>Participantes</Label>
          {members.map((member) => {
            const selected = selectedIds.includes(member.id);
            return (
              <Button
                key={member.id}
                variant={selected ? 'default' : 'outline'}
                onPress={() =>
                  setSelectedIds((current) =>
                    selected
                      ? current.filter((value) => value !== member.id)
                      : [...current, member.id],
                  )
                }
              >
                <Text style={styles.buttonText}>
                  {selected ? '✓ ' : ''}
                  {member.name}
                </Text>
              </Button>
            );
          })}
          {categories.length > 0 ? (
            <>
              <Label>Categoría</Label>
              <Button
                variant={!categoryId ? 'default' : 'outline'}
                onPress={() => setCategoryId('')}
              >
                <Text style={styles.buttonText}>Sin categoría</Text>
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={categoryId === category.id ? 'default' : 'outline'}
                  onPress={() => setCategoryId(category.id)}
                >
                  <Text style={styles.buttonText}>{category.name}</Text>
                </Button>
              ))}
            </>
          ) : null}
          <Button
            disabled={mutation.isPending}
            onPress={() =>
              mutation.mutate(undefined, {
                onError: () =>
                  Alert.alert(
                    'No se pudo guardar',
                    'Completa los datos e intenta nuevamente.',
                  ),
              })
            }
          >
            {mutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar gasto</Text>
            )}
          </Button>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 152 },
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
