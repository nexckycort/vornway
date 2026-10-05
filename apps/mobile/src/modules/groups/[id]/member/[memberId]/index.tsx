import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Member = { id: string; name: string };
type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category?: { name: string } | null;
};
type ExpenseResponse = {
  data: Expense[];
  summary?: {
    spentByCurrency?: Record<string, number>;
    grossPaidByCurrency?: Record<string, number>;
  };
};
export default function GroupMemberExpensesScreen() {
  const { id, memberId } = useLocalSearchParams<{
    id: string;
    memberId: string;
  }>();
  const router = useRouter();
  const [paidOnly, setPaidOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('group_load_failed');
      return response.json();
    },
  });
  const expensesQuery = useQuery({
    queryKey: [
      'group-member-expenses',
      id,
      memberId,
      paidOnly,
      startDate,
      endDate,
    ],
    enabled: Boolean(id && memberId),
    queryFn: async () => {
      const response = await groupsClient[':id'].members[
        ':memberId'
      ].expenses.$get({
        param: { id: id ?? '', memberId: memberId ?? '' },
        query: {
          limit: '50',
          ...(paidOnly ? { paidOnly: 'true' } : {}),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        },
      });
      if (!response.ok) throw new Error('member_expenses_load_failed');
      return response.json() as Promise<ExpenseResponse>;
    },
  });
  const member =
    groupQuery.data && 'members' in groupQuery.data
      ? groupQuery.data.members.find((item: Member) => item.id === memberId)
      : null;
  const summary = expensesQuery.data?.summary;
  const expenses = expensesQuery.data?.data ?? [];
  return (
    <Screen>
      <ScreenHeader
        title={member?.name ?? 'Participante'}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {groupQuery.isLoading || expensesQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : member ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.title}>Resumen de {member.name}</Text>
              <Text style={styles.copy}>
                {paidOnly
                  ? 'Gastos pagados por este participante.'
                  : 'Gastos relacionados con este participante.'}
              </Text>
              {Object.entries(summary?.spentByCurrency ?? {}).map(
                ([currency, value]) => (
                  <Text key={`spent-${currency}`} style={styles.copy}>
                    Gastado: {value} {currency}
                  </Text>
                ),
              )}
              {Object.entries(summary?.grossPaidByCurrency ?? {}).map(
                ([currency, value]) => (
                  <Text key={`paid-${currency}`} style={styles.copy}>
                    Pagado: {value} {currency}
                  </Text>
                ),
              )}
            </Card>
            <Card style={styles.card}>
              <Text style={styles.title}>Gastos</Text>
              <Button
                variant={paidOnly ? 'default' : 'outline'}
                onPress={() => setPaidOnly((current) => !current)}
              >
                <Text style={paidOnly ? styles.buttonText : styles.outlineText}>
                  Solo gastos pagados
                </Text>
              </Button>
              <Input
                value={startDate}
                onChangeText={setStartDate}
                placeholder="Desde (AAAA-MM-DD)"
              />
              <Input
                value={endDate}
                onChangeText={setEndDate}
                placeholder="Hasta (AAAA-MM-DD)"
              />
              <Button
                variant="ghost"
                onPress={() => {
                  setPaidOnly(false);
                  setStartDate('');
                  setEndDate('');
                }}
              >
                <Text style={styles.outlineText}>Limpiar filtros</Text>
              </Button>
              {expenses.length === 0 ? (
                <Text style={styles.copy}>
                  No hay gastos para este participante.
                </Text>
              ) : (
                expenses.map((expense) => (
                  <Button
                    key={expense.id}
                    variant="ghost"
                    onPress={() =>
                      router.push(
                        `/groups/${id}/expense/${expense.id}` as never,
                      )
                    }
                  >
                    <Text style={styles.copy}>
                      {expense.description} · {expense.amount}{' '}
                      {expense.currency}
                      {expense.category?.name
                        ? ` · ${expense.category.name}`
                        : ''}
                    </Text>
                  </Button>
                ))
              )}
            </Card>
          </>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.copy}>Participante no encontrado.</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  card: { gap: 12, padding: 20 },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
});
