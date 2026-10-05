import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Tab = 'balance' | 'totals';
type Totals = {
  totalsByCurrency: Record<string, number>;
  expenseCountByCurrency: Record<string, number>;
  categoriesByCurrency: Record<
    string,
    Array<{ key: string; id?: string | null; name: string; amount: number }>
  >;
};
type Balances = {
  memberBalances: Array<{
    memberId: string;
    name: string;
    balances: Record<string, number>;
  }>;
};

export default function GroupReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('balance');
  const totalsQuery = useQuery({
    queryKey: ['group-report-totals', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].reports.totals.$get({
        param: { id: id ?? '' },
        query: { range: 'all' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el reporte');
      return response.json();
    },
  });
  const balancesQuery = useQuery({
    queryKey: ['group-report-balances', id],
    enabled: Boolean(id) && tab === 'balance',
    queryFn: async () => {
      const response = await groupsClient[':id'].reports.balances.$get({
        param: { id: id ?? '' },
        query: { range: 'all' },
      });
      if (!response.ok) throw new Error('No se pudo cargar los saldos');
      return response.json();
    },
  });
  const totals = (
    totalsQuery.data && 'totalsByCurrency' in totalsQuery.data
      ? totalsQuery.data
      : null
  ) as Totals | null;
  const currencies = Object.keys(totals?.totalsByCurrency ?? {});
  const currency = currencies[0] ?? 'COP';
  const categories = totals?.categoriesByCurrency?.[currency] ?? [];
  const balances = (
    balancesQuery.data && 'memberBalances' in balancesQuery.data
      ? balancesQuery.data
      : null
  ) as Balances | null;
  const loading =
    totalsQuery.isLoading || (tab === 'balance' && balancesQuery.isLoading);

  return (
    <Screen>
      <ScreenHeader title="Reportes" onBack={() => router.back()} />
      <View style={styles.tabs}>
        <Button
          variant={tab === 'balance' ? 'default' : 'outline'}
          onPress={() => setTab('balance')}
        >
          <Text style={styles.buttonText}>Balance</Text>
        </Button>
        <Button
          variant={tab === 'totals' ? 'default' : 'outline'}
          onPress={() => setTab('totals')}
        >
          <Text style={styles.buttonText}>Totales</Text>
        </Button>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Spinner color="#DE034D" /> : null}
        {tab === 'totals' && totals ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.title}>Total del espacio</Text>
              <Text style={styles.amount}>
                {totals.totalsByCurrency?.[currency] ?? 0} {currency}
              </Text>
              <Text style={styles.copy}>
                {totals.expenseCountByCurrency?.[currency] ?? 0} gastos
              </Text>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.title}>Por categoría</Text>
              {categories.length === 0 ? (
                <Text style={styles.copy}>Sin gastos categorizados.</Text>
              ) : null}
              {categories.map((category) => (
                <Button
                  key={category.key}
                  variant="ghost"
                  onPress={() =>
                    router.push({
                      pathname: `/groups/${id}/reports/category` as never,
                      params: {
                        categoryKey: category.key,
                        ...(category.id ? { categoryId: category.id } : {}),
                        categoryName: category.name,
                      },
                    })
                  }
                >
                  <View style={styles.row}>
                    <Text style={styles.copy}>{category.name}</Text>
                    <Text style={styles.copy}>
                      {category.amount} {currency}
                    </Text>
                  </View>
                </Button>
              ))}
            </Card>
          </>
        ) : null}
        {tab === 'balance' ? (
          <Card style={styles.card}>
            <Text style={styles.title}>Saldos de participantes</Text>
            {(balances?.memberBalances.length ?? 0) === 0 ? (
              <Text style={styles.copy}>No hay movimientos.</Text>
            ) : null}
            {balances?.memberBalances.map((member) => (
              <View key={member.memberId} style={styles.row}>
                <Text style={styles.copy}>{member.name}</Text>
                <Text
                  style={[
                    styles.copy,
                    (member.balances[currency] ?? 0) < 0 && styles.negative,
                  ]}
                >
                  {member.balances[currency] ?? 0} {currency}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  card: { gap: 12, padding: 20 },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  negative: { color: '#DC2626' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
