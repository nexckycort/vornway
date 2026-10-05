import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { debtsClient } from '@/api/debts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Debt = {
  id: string;
  name: string;
  counterpartyName: string;
  remainingAmount: number;
  currency: string;
  direction: string;
  description?: string | null;
};
export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [payment, setPayment] = useState('');
  const debtQuery = useQuery({
    queryKey: ['debt', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await debtsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('debt_load_failed');
      return (await response.json()) as Debt;
    },
  });
  const paymentMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(payment.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid');
      const response = await debtsClient[':id'].payments.$post({
        param: { id: id ?? '' },
        json: { amount, paidAt: new Date().toISOString() },
      });
      if (!response.ok) throw new Error('payment_failed');
    },
    onSuccess: async () => {
      setPayment('');
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await debtsClient[':id'].$delete({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('delete_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
      router.back();
    },
  });
  const debt = debtQuery.data;
  return (
    <Screen>
      <ScreenHeader
        title={debt?.name ?? 'Deuda'}
        onBack={() => router.back()}
      />
      {!debt ? (
        <Spinner color="#DE034D" />
      ) : (
        <Card style={styles.card}>
          <Text style={styles.title}>{debt.name}</Text>
          <Text style={styles.copy}>
            {debt.direction === 'lent'
              ? `Te debe ${debt.counterpartyName}`
              : `Debes a ${debt.counterpartyName}`}
          </Text>
          <Text style={styles.amount}>
            {debt.remainingAmount} {debt.currency}
          </Text>
          {debt.description ? (
            <Text style={styles.copy}>{debt.description}</Text>
          ) : null}
          <Input
            value={payment}
            onChangeText={setPayment}
            keyboardType="decimal-pad"
            placeholder="Monto abonado"
          />
          <Button
            disabled={paymentMutation.isPending}
            onPress={() =>
              paymentMutation.mutate(undefined, {
                onError: () =>
                  Alert.alert('No se pudo registrar', 'Intenta nuevamente.'),
              })
            }
          >
            <Text style={styles.buttonText}>Registrar abono</Text>
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onPress={() =>
              deleteMutation.mutate(undefined, {
                onError: () =>
                  Alert.alert('No se pudo eliminar', 'Intenta nuevamente.'),
              })
            }
          >
            <Text style={styles.delete}>Eliminar deuda</Text>
          </Button>
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 14, margin: 16, padding: 20 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
});
