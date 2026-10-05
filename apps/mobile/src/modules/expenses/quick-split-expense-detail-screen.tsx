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
  const [expense, setExpense] = useState<Expense | null>(null);
  const [settlement, setSettlement] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!quickSplitId || !expenseId) return;
    void quickSplitsClient[':id'].expenses[':expenseId']
      .$get({ param: { id: quickSplitId, expenseId } })
      .then(async (response) => {
        if (response.ok)
          setExpense((await response.json()) as unknown as Expense);
      });
  }, [quickSplitId, expenseId]);
  async function settle() {
    const amount = Number(settlement.replace(',', '.'));
    const participants = expense?.participants ?? [];
    if (
      !quickSplitId ||
      !expenseId ||
      participants.length < 2 ||
      !Number.isFinite(amount) ||
      amount <= 0
    )
      return;
    setSaving(true);
    const response = await quickSplitsClient[':id'].expenses[
      ':expenseId'
    ].settlements.$post({
      param: { id: quickSplitId, expenseId },
      json: {
        amount,
        currency: expense?.currency ?? 'COP',
        fromParticipantId: participants[0]?.id ?? '',
        toParticipantId: participants[1]?.id ?? '',
      },
    });
    setSaving(false);
    if (!response.ok) {
      Alert.alert('No se pudo registrar', 'Intenta nuevamente.');
      return;
    }
    setSettlement('');
    Alert.alert('Listo', 'El abono fue registrado.');
  }
  async function remove() {
    if (!quickSplitId || !expenseId) return;
    const response = await quickSplitsClient[':id'].expenses[
      ':expenseId'
    ].$delete({ param: { id: quickSplitId, expenseId } });
    if (response.ok) router.back();
    else Alert.alert('No se pudo eliminar', 'Intenta nuevamente.');
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
          <Input
            value={settlement}
            onChangeText={setSettlement}
            keyboardType="decimal-pad"
            placeholder="Monto del abono"
          />
          <Button disabled={saving} onPress={() => void settle()}>
            {saving ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Registrar abono</Text>
            )}
          </Button>
          <Button variant="destructive" onPress={() => void remove()}>
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
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
});
