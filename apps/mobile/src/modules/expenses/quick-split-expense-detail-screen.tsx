import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { quickSplitsClient } from '@/api/quick-splits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Expense = {
  description: string;
  amount: number;
  currency: string;
  participants?: Array<{ id: string; name: string; balance?: number }>;
};
export default function QuickSplitExpenseDetailScreen() {
  const { quickSplitId, expenseId } = useLocalSearchParams<{
    quickSplitId: string;
    expenseId: string;
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [settlement, setSettlement] = useState('');
  const [fromParticipantId, setFromParticipantId] = useState('');
  const [toParticipantId, setToParticipantId] = useState('');
  const expenseQuery = useQuery({
    queryKey: ['quick-split-expense', quickSplitId, expenseId],
    enabled: Boolean(quickSplitId && expenseId),
    queryFn: async () => {
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].$get({
        param: { id: quickSplitId ?? '', expenseId: expenseId ?? '' },
      });
      if (!response.ok) throw new Error('expense_load_failed');
      return (await response.json()) as unknown as Expense;
    },
  });
  const expense = expenseQuery.data ?? null;
  useEffect(() => {
    if (!expense || fromParticipantId || toParticipantId) return;
    setFromParticipantId(expense.participants?.[0]?.id ?? '');
    setToParticipantId(expense.participants?.[1]?.id ?? '');
  }, [expense, fromParticipantId, toParticipantId]);
  const settlementMutation = useMutation({
    mutationFn: async (amount: number) => {
      if (!quickSplitId || !expenseId || !expense) throw new Error('invalid');
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].settlements.$post({
        param: { id: quickSplitId, expenseId },
        json: {
          amount,
          currency: expense.currency,
          fromParticipantId,
          toParticipantId,
        },
      });
      if (!response.ok) throw new Error('settlement_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['quick-split-expense', quickSplitId, expenseId],
        }),
        queryClient.invalidateQueries({ queryKey: ['quick-split-expenses'] }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!quickSplitId || !expenseId) throw new Error('invalid');
      const response = await quickSplitsClient[':id'].expenses[
        ':expenseId'
      ].$delete({ param: { id: quickSplitId, expenseId } });
      if (!response.ok) throw new Error('delete_failed');
    },
    onSuccess: () => router.back(),
  });
  async function settle() {
    const amount = Number(settlement.replace(',', '.'));
    const participants = expense?.participants ?? [];
    if (
      !quickSplitId ||
      !expenseId ||
      participants.length < 2 ||
      !fromParticipantId ||
      !toParticipantId ||
      fromParticipantId === toParticipantId ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      return;
    try {
      await settlementMutation.mutateAsync(amount);
    } catch {
      Alert.alert('No se pudo registrar', 'Intenta nuevamente.');
      return;
    }
    setSettlement('');
    Alert.alert('Listo', 'El abono fue registrado.');
  }
  async function remove() {
    try {
      await deleteMutation.mutateAsync();
    } catch {
      Alert.alert('No se pudo eliminar', 'Intenta nuevamente.');
    }
  }
  return (
    <Screen>
      <ScreenHeader title="Detalle del gasto" onBack={() => router.back()} />
      {expense ? (
        <Card style={styles.card}>
          <Text style={styles.title}>{expense.description}</Text>
          <Text style={styles.amount}>
            {expense.amount} {expense.currency}
          </Text>
          {expense.participants?.map((participant) => (
            <Text key={participant.id} style={styles.copy}>
              {participant.name}: {participant.balance ?? 0}
            </Text>
          ))}
          <Text style={styles.label}>Quién paga</Text>
          {expense.participants?.map((participant) => (
            <Button
              key={`from-${participant.id}`}
              variant={
                fromParticipantId === participant.id ? 'default' : 'outline'
              }
              onPress={() => setFromParticipantId(participant.id)}
            >
              <Text style={styles.buttonText}>{participant.name}</Text>
            </Button>
          ))}
          <Text style={styles.label}>Quién recibe</Text>
          {expense.participants?.map((participant) => (
            <Button
              key={`to-${participant.id}`}
              variant={
                toParticipantId === participant.id ? 'default' : 'outline'
              }
              onPress={() => setToParticipantId(participant.id)}
            >
              <Text style={styles.buttonText}>{participant.name}</Text>
            </Button>
          ))}
          <Input
            value={settlement}
            onChangeText={setSettlement}
            keyboardType="decimal-pad"
            placeholder="Monto del abono"
          />
          <Button
            disabled={settlementMutation.isPending}
            onPress={() => void settle()}
          >
            {settlementMutation.isPending ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Registrar abono</Text>
            )}
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onPress={() => void remove()}
          >
            <Text style={styles.delete}>Eliminar gasto</Text>
          </Button>
        </Card>
      ) : (
        <Spinner color="#DE034D" />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 20 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  label: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
});
