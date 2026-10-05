import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
  principalAmount: number;
  currency: string;
  direction: string;
  status: string;
  description?: string | null;
};
export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [debt, setDebt] = useState<Debt | null>(null);
  const [payment, setPayment] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id) return;
    void debtsClient[':id'].$get({ param: { id } }).then(async (response) => {
      if (response.ok) setDebt((await response.json()) as unknown as Debt);
    });
  }, [id]);
  async function addPayment() {
    const amount = Number(payment.replace(',', '.'));
    if (!id || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    const response = await debtsClient[':id'].payments.$post({
      param: { id },
      json: { amount, paidAt: new Date().toISOString() },
    });
    setSaving(false);
    if (!response.ok) {
      Alert.alert('No se pudo registrar', 'Intenta nuevamente.');
      return;
    }
    setPayment('');
    const next = await debtsClient[':id'].$get({ param: { id } });
    if (next.ok) setDebt((await next.json()) as unknown as Debt);
  }
  async function remove() {
    if (!id) return;
    const response = await debtsClient[':id'].$delete({ param: { id } });
    if (!response.ok) {
      Alert.alert('No se pudo eliminar', 'Intenta nuevamente.');
      return;
    }
    router.back();
  }
  return (
    <Screen>
      <ScreenHeader
        title={debt?.name ?? 'Deuda'}
        onBack={() => router.back()}
      />
      {debt ? (
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
          <Button disabled={saving} onPress={() => void addPayment()}>
            {saving ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Registrar abono</Text>
            )}
          </Button>
          <Button variant="destructive" onPress={() => void remove()}>
            <Text style={styles.delete}>Eliminar deuda</Text>
          </Button>
        </Card>
      ) : (
        <Spinner color="#DE034D" />
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
