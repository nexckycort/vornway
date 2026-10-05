import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Group = {
  directDebts?: Array<{
    toMemberId: string;
    toName: string;
    amount: number;
    currency: string;
  }>;
  directCredits?: Array<{
    fromMemberId: string;
    fromName: string;
    amount: number;
    currency: string;
  }>;
  myMembership?: { id: string; name: string };
};
export default function GroupSettleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const groupQuery = useQuery({
    queryKey: ['group-detail', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('group_load_failed');
      return (await response.json()) as unknown as Group;
    },
  });
  const option =
    groupQuery.data?.directDebts?.[0] ?? groupQuery.data?.directCredits?.[0];
  const fromMemberId = groupQuery.data?.directDebts?.[0]
    ? groupQuery.data?.myMembership?.id
    : groupQuery.data?.directCredits?.[0]?.fromMemberId;
  const toMemberId =
    groupQuery.data?.directDebts?.[0]?.toMemberId ??
    groupQuery.data?.myMembership?.id;
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await groupsClient[':id'].settlements.$post({
        param: { id: id ?? '' },
        json: {
          fromMemberId: fromMemberId ?? '',
          toMemberId: toMemberId ?? '',
          amount: Number(amount.replace(',', '.')),
          currency: option?.currency ?? 'COP',
        },
      });
      if (!response.ok) throw new Error('settlement_failed');
      return response.json();
    },
    onSuccess: () => router.back(),
  });
  function submit() {
    const value = Number(amount.replace(',', '.'));
    if (!fromMemberId || !toMemberId || !Number.isFinite(value) || value <= 0)
      return;
    void mutation
      .mutateAsync()
      .catch(() => Alert.alert('No se pudo registrar', 'Intenta nuevamente.'));
  }
  return (
    <Screen>
      <ScreenHeader title="Liquidar saldo" onBack={() => router.back()} />
      {groupQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : (
        <Card style={styles.card}>
          {option ? (
            <>
              <Text style={styles.title}>
                {groupQuery.data?.directDebts?.[0]
                  ? `Pagar a ${groupQuery.data.directDebts[0].toName}`
                  : `Registrar pago de ${groupQuery.data?.directCredits?.[0]?.fromName ?? ''}`}
              </Text>
              <Text style={styles.copy}>
                Saldo sugerido: {option.amount} {option.currency}
              </Text>
              <Label>Monto</Label>
              <Input
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={String(option.amount)}
              />
              <Button disabled={mutation.isPending} onPress={submit}>
                <Text style={styles.buttonText}>
                  {mutation.isPending
                    ? 'Guardando...'
                    : 'Registrar liquidación'}
                </Text>
              </Button>
            </>
          ) : (
            <Text style={styles.copy}>
              No hay saldos pendientes para liquidar.
            </Text>
          )}
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 14, margin: 16, padding: 20 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
