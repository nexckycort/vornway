import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
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
type Option = {
  key: string;
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
  currency: string;
};
export default function GroupSettleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState('');
  const [amount, setAmount] = useState('');
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('group_load_failed');
      return (await response.json()) as Group;
    },
  });
  const options = useMemo<Option[]>(() => {
    const group = groupQuery.data;
    const me = group?.myMembership;
    if (!me) return [];
    return [
      ...(group.directDebts ?? []).map((item) => ({
        key: `${me.id}:${item.toMemberId}:${item.currency}`,
        fromMemberId: me.id,
        fromName: me.name,
        toMemberId: item.toMemberId,
        toName: item.toName,
        amount: item.amount,
        currency: item.currency,
      })),
      ...(group.directCredits ?? []).map((item) => ({
        key: `${item.fromMemberId}:${me.id}:${item.currency}`,
        fromMemberId: item.fromMemberId,
        fromName: item.fromName,
        toMemberId: me.id,
        toName: me.name,
        amount: item.amount,
        currency: item.currency,
      })),
    ];
  }, [groupQuery.data]);
  const selected =
    options.find((item) => item.key === selectedKey) ?? options[0];
  useEffect(() => {
    if (selected && !selectedKey) {
      setSelectedKey(selected.key);
      setAmount(String(selected.amount));
    }
  }, [selected, selectedKey]);
  const mutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(',', '.'));
      if (
        !selected ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value > selected.amount
      )
        throw new Error('invalid');
      const response = await groupsClient[':id'].settlements.$post({
        param: { id: id ?? '' },
        json: {
          fromMemberId: selected.fromMemberId,
          toMemberId: selected.toMemberId,
          amount: value,
          currency: selected.currency,
        },
      });
      if (!response.ok) throw new Error('settlement_failed');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-summary', id] });
      await queryClient.invalidateQueries({ queryKey: ['group-reports', id] });
      router.back();
    },
  });
  return (
    <Screen>
      <ScreenHeader title="Liquidar saldo" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {groupQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : (
          <Card style={styles.card}>
            {options.length === 0 ? (
              <Text style={styles.copy}>
                No hay saldos pendientes para liquidar.
              </Text>
            ) : (
              <>
                <Text style={styles.title}>Selecciona un movimiento</Text>
                {options.map((option) => (
                  <Button
                    key={option.key}
                    variant={
                      option.key === selected?.key ? 'default' : 'outline'
                    }
                    onPress={() => {
                      setSelectedKey(option.key);
                      setAmount(String(option.amount));
                    }}
                  >
                    <Text style={styles.buttonText}>
                      {option.fromName} → {option.toName} · {option.amount}{' '}
                      {option.currency}
                    </Text>
                  </Button>
                ))}
                {selected ? (
                  <>
                    <Label>Monto a liquidar</Label>
                    <Input
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder={String(selected.amount)}
                    />
                    <Button
                      disabled={mutation.isPending}
                      onPress={() =>
                        mutation.mutate(undefined, {
                          onError: () =>
                            Alert.alert(
                              'No se pudo registrar',
                              'El monto no puede superar el saldo pendiente.',
                            ),
                        })
                      }
                    >
                      <Text style={styles.buttonText}>
                        {mutation.isPending
                          ? 'Guardando...'
                          : 'Registrar liquidación'}
                      </Text>
                    </Button>
                  </>
                ) : null}
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { paddingBottom: 152 },
  card: { gap: 14, margin: 16, padding: 20 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
