import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  principalAmount?: number;
  expectedTotal?: number;
  paidAmount?: number;
  currency: string;
  direction: string;
  description?: string | null;
  status?: string;
  dueDate?: string | null;
  amounts?: Array<{
    id: string;
    amount: number;
    loanDate: string;
    note?: string | null;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paidAt: string;
    note?: string | null;
  }>;
};
export default function DebtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [payment, setPayment] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [addingLoan, setAddingLoan] = useState(false);
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
  const loanMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(loanAmount.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid');
      const response = await debtsClient[':id'].amounts.$post({
        param: { id: id ?? '' },
        json: { amount, loanDate: new Date().toISOString().slice(0, 10) },
      });
      if (!response.ok) throw new Error('loan_failed');
    },
    onSuccess: async () => {
      setLoanAmount('');
      setAddingLoan(false);
      await queryClient.invalidateQueries({ queryKey: ['debt', id] });
      await queryClient.invalidateQueries({ queryKey: ['debts'] });
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
        <ScrollView contentContainerStyle={styles.content}>
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
            <Text style={styles.copy}>
              Restante · {debt.paidAmount ?? 0} pagado de{' '}
              {debt.expectedTotal ??
                debt.principalAmount ??
                debt.remainingAmount}
            </Text>
            {debt.dueDate ? (
              <Text style={styles.copy}>
                Vence {new Date(debt.dueDate).toLocaleDateString('es-CO')}
              </Text>
            ) : null}
            {debt.description ? (
              <Text style={styles.copy}>{debt.description}</Text>
            ) : null}
            {debt.status === 'paid' ? (
              <Text style={styles.paid}>✓ Deuda pagada</Text>
            ) : (
              <>
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
                        Alert.alert(
                          'No se pudo registrar',
                          'Intenta nuevamente.',
                        ),
                    })
                  }
                >
                  <Text style={styles.buttonText}>Registrar abono</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => setAddingLoan((current) => !current)}
                >
                  <Text style={styles.outlineText}>＋ Agregar monto</Text>
                </Button>
                {addingLoan ? (
                  <View style={styles.loanForm}>
                    <Input
                      value={loanAmount}
                      onChangeText={setLoanAmount}
                      keyboardType="decimal-pad"
                      placeholder="Nuevo monto prestado"
                    />
                    <Button
                      disabled={loanMutation.isPending}
                      onPress={() =>
                        loanMutation.mutate(undefined, {
                          onError: () =>
                            Alert.alert(
                              'No se pudo agregar',
                              'Intenta nuevamente.',
                            ),
                        })
                      }
                    >
                      <Text style={styles.buttonText}>Guardar monto</Text>
                    </Button>
                  </View>
                ) : null}
              </>
            )}
          </Card>
          <Card style={styles.activityCard}>
            <Text style={styles.sectionTitle}>Actividad</Text>
            {[
              ...(debt.amounts ?? []).map((item) => ({
                id: `loan-${item.id}`,
                label: 'Monto agregado',
                amount: item.amount,
                date: item.loanDate,
              })),
              ...(debt.payments ?? []).map((item) => ({
                id: `payment-${item.id}`,
                label: 'Abono',
                amount: item.amount,
                date: item.paidAt,
              })),
            ]
              .sort((left, right) => right.date.localeCompare(left.date))
              .map((item) => (
                <View key={item.id} style={styles.activityRow}>
                  <View>
                    <Text style={styles.activityLabel}>{item.label}</Text>
                    <Text style={styles.copy}>
                      {new Date(item.date).toLocaleDateString('es-CO')}
                    </Text>
                  </View>
                  <Text style={styles.activityAmount}>
                    {item.amount} {debt.currency}
                  </Text>
                </View>
              ))}
          </Card>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onPress={() =>
              Alert.alert('Eliminar deuda', '¿Quieres eliminar esta deuda?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: () =>
                    deleteMutation.mutate(undefined, {
                      onError: () =>
                        Alert.alert(
                          'No se pudo eliminar',
                          'Intenta nuevamente.',
                        ),
                    }),
                },
              ])
            }
          >
            <Text style={styles.delete}>Eliminar deuda</Text>
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  card: { gap: 14, padding: 20 },
  activityCard: { gap: 12, padding: 18 },
  sectionTitle: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
  activityRow: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  activityLabel: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  activityAmount: { color: '#DE034D', fontSize: 14, fontWeight: '600' },
  loanForm: { gap: 10 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  paid: { color: '#15803D', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  delete: { color: '#B91C1C', fontSize: 14, fontWeight: '600' },
});
