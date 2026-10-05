import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { quickSplitsClient } from '@/api/quick-splits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Expense = {
  id: string;
  quickSplitId: string;
  description: string;
  amount: number;
  currency: string;
  quickSplitName?: string;
  paidBy?: { name: string };
  currentUserBalance?: number;
};
type ExpenseFilter = 'all' | 'settled' | 'owed' | 'owe';
export default function ExpensesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExpenseFilter>('all');
  const expensesQuery = useQuery({
    queryKey: ['quick-split-expenses'],
    queryFn: async () => {
      const response = await quickSplitsClient.expenses.$get({
        query: { limit: '50' },
      });
      if (!response.ok) throw new Error('expenses_load_failed');
      return (await response.json()) as { data: Expense[] };
    },
  });
  const visible = (expensesQuery.data?.data ?? []).filter((item) => {
    const matchesSearch =
      `${item.description} ${item.quickSplitName ?? ''} ${item.paidBy?.name ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const balance = item.currentUserBalance ?? 0;
    const matchesFilter =
      filter === 'all' ||
      (filter === 'settled' && balance === 0) ||
      (filter === 'owed' && balance > 0) ||
      (filter === 'owe' && balance < 0);
    return matchesSearch && matchesFilter;
  });
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={expensesQuery.isRefetching}
            onRefresh={() => void expensesQuery.refetch()}
          />
        }
      >
        <Text style={styles.heading}>Gastos compartidos</Text>
        <Button onPress={() => router.push('/expenses/new' as never)}>
          <Text style={styles.buttonText}>＋ Nuevo gasto</Text>
        </Button>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar gastos"
          style={styles.search}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {(
            [
              ['all', 'Todos'],
              ['settled', 'Salda'],
              ['owed', 'Le deben'],
              ['owe', 'Debe'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              variant={filter === value ? 'default' : 'outline'}
              onPress={() => setFilter(value)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter !== value && styles.filterTextOutline,
                ]}
              >
                {label}
              </Text>
            </Button>
          ))}
        </ScrollView>
        {expensesQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : visible.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No hay gastos compartidos</Text>
            <Text style={styles.copy}>
              Crea un gasto para dividirlo con tus amigos.
            </Text>
          </Card>
        ) : (
          visible.map((item) => (
            <Card key={item.id} style={styles.card}>
              <Button
                variant="ghost"
                onPress={() =>
                  router.push(
                    `/expenses/friends/${item.quickSplitId}/${item.id}` as never,
                  )
                }
              >
                <Text style={styles.title}>{item.description}</Text>
                <Text style={styles.copy}>
                  {item.quickSplitName || 'Gasto compartido'}
                </Text>
                <Text style={styles.amount}>
                  {item.amount} {item.currency}
                </Text>
                <Text style={styles.copy}>
                  {item.paidBy?.name ? `Pagado por ${item.paidBy.name}` : ''}
                </Text>
              </Button>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  heading: { color: '#0F172A', fontSize: 28, fontWeight: '600' },
  search: { backgroundColor: '#FFFFFF', borderRadius: 24, height: 44 },
  filters: { gap: 8, paddingVertical: 2 },
  card: { gap: 6, padding: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 24 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  amount: { color: '#DE034D', fontSize: 18, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  filterText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterTextOutline: { color: '#0F172A' },
});
