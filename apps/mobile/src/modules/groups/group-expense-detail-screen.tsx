import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Expense = {
  description: string;
  amount: number;
  currency: string;
  paidBy?: { name: string };
};
export default function GroupExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId: string;
  }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  useEffect(() => {
    if (!id || !expenseId) return;
    void groupsClient[':id'].expenses[':expenseId']
      .$get({ param: { id, expenseId } })
      .then(async (response) => {
        if (response.ok)
          setExpense((await response.json()) as unknown as Expense);
      });
  }, [id, expenseId]);
  async function remove() {
    if (!id || !expenseId) return;
    const response = await groupsClient[':id'].expenses[':expenseId'].$delete({
      param: { id, expenseId },
    });
    if (!response.ok) {
      Alert.alert('No se pudo eliminar', 'Intenta nuevamente.');
      return;
    }
    router.back();
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
          <Text style={styles.copy}>
            {expense.paidBy?.name
              ? `Pagado por ${expense.paidBy.name}`
              : 'Gasto compartido'}
          </Text>
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
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
});
