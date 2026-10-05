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
  const { id, settlementExpenseId } = useLocalSearchParams<{
    id: string;
    settlementExpenseId?: string;
  }>();
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
  const settlementExpenseQuery = useQuery({
    queryKey: ['group-expense', id, settlementExpenseId],
    enabled: Boolean(id && settlementExpenseId),
    queryFn: async () => {
      const response = await groupsClient[':id'].expenses[':expenseId'].$get({
        param: { id: id ?? '', expenseId: settlementExpenseId ?? '' },
      });
      if (!response.ok) throw new Error('settlement_load_failed');
      return response.json();
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
  const settlementExpense =
    settlementExpenseQuery.data && 'isSettlement' in settlementExpenseQuery.data
      ? settlementExpenseQuery.data
      : null;
  const editingOption: Option | undefined = settlementExpense?.isSettlement
    ? (() => {
        const participant = settlementExpense.participants?.[0];
        if (!participant || !settlementExpense.paidBy) return undefined;
        const key = `${settlementExpense.paidBy.id}:${participant.memberId}:${settlementExpense.currency}`;
        const pendingDebt =
          options.find((option) => option.key === key)?.amount ?? 0;
        return {
          key,
          fromMemberId: settlementExpense.paidBy.id,
          fromName: settlementExpense.paidBy.name,
          toMemberId: participant.memberId,
          toName: participant.name,
          amount: pendingDebt + settlementExpense.amount,
          currency: settlementExpense.currency,
        };
      })()
    : undefined;
  const activeOption = settlementExpenseId ? editingOption : selected;
  useEffect(() => {
    if (settlementExpenseId && editingOption) {
      setSelectedKey(editingOption.key);
      setAmount(String(editingOption.amount));
      return;
    }
    if (selected && !selectedKey) {
      setSelectedKey(selected.key);
      setAmount(String(selected.amount));
    }
  }, [editingOption, selected, selectedKey, settlementExpenseId]);
  const mutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount.replace(',', '.'));
      const option = settlementExpenseId ? activeOption : selected;
      if (
        !option ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value > option.amount
      )
        throw new Error('invalid');
      const response = await groupsClient[':id'].settlements.$post({
        param: { id: id ?? '' },
        json: {
          fromMemberId: option.fromMemberId,
          toMemberId: option.toMemberId,
          amount: value,
          currency: option.currency,
        },
      });
      if (!response.ok) throw new Error('settlement_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-reports', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
      ]);
      router.replace(`/groups/${id}` as never);
    },
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!settlementExpenseId || !activeOption) throw new Error('invalid');
      const value = Number(amount.replace(',', '.'));
      const response = await groupsClient[':id'].expenses[':expenseId'].$put({
        param: { id: id ?? '', expenseId: settlementExpenseId },
        json: {
          description: `Liquidación: ${activeOption.fromName} → ${activeOption.toName}`,
          amount: value,
          currency: activeOption.currency,
          paidById: activeOption.fromMemberId,
          participantIds: [activeOption.toMemberId],
          splitMethod: 'exact',
          exactShares: { [activeOption.toMemberId]: value },
        },
      });
      if (!response.ok) throw new Error('settlement_update_failed');
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['home-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-expenses', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-report'] }),
        queryClient.invalidateQueries({
          queryKey: ['group-expense', id, settlementExpenseId],
        }),
      ]);
      router.replace(`/groups/${id}` as never);
    },
  });
  return (
    <Screen>
      <ScreenHeader
        title="Liquidar saldo"
        onBack={() => router.replace(`/groups/${id}` as never)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {groupQuery.isLoading || settlementExpenseQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : groupQuery.isError || settlementExpenseQuery.isError ? (
          <Card style={styles.card}>
            <Text style={styles.copy}>No pudimos cargar los saldos.</Text>
            <Button
              onPress={() => {
                void groupQuery.refetch();
                if (settlementExpenseId) void settlementExpenseQuery.refetch();
              }}
            >
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : (
          <Card style={styles.card}>
            {options.length === 0 && !editingOption ? (
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
                {activeOption ? (
                  <>
                    <Label>Monto a liquidar</Label>
                    <Input
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder={String(activeOption.amount)}
                    />
                    <Button
                      disabled={mutation.isPending || updateMutation.isPending}
                      onPress={() =>
                        settlementExpenseId
                          ? updateMutation.mutate(undefined, {
                              onError: () =>
                                Alert.alert(
                                  'No se pudo actualizar',
                                  'Intenta nuevamente.',
                                ),
                            })
                          : mutation.mutate(undefined, {
                              onError: () =>
                                Alert.alert(
                                  'No se pudo registrar',
                                  'El monto no puede superar el saldo pendiente.',
                                ),
                            })
                      }
                    >
                      <Text style={styles.buttonText}>
                        {mutation.isPending || updateMutation.isPending
                          ? 'Guardando...'
                          : settlementExpenseId
                            ? 'Guardar cambios'
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
