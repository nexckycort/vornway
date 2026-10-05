import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GroupCategoryReportScreen() {
  const { id, categoryKey, categoryId, categoryName } = useLocalSearchParams<{
    id: string;
    categoryKey?: string;
    categoryId?: string;
    categoryName?: string;
  }>();
  const router = useRouter();
  const totalsQuery = useQuery({
    queryKey: ['group-report-totals', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].reports.totals.$get({
        param: { id: id ?? '' },
        query: { range: 'all' },
      });
      if (!response.ok) throw new Error('report_load_failed');
      return response.json();
    },
  });
  const totals =
    totalsQuery.data && 'totalsByCurrency' in totalsQuery.data
      ? totalsQuery.data
      : null;
  const currency = Object.keys(totals?.totalsByCurrency ?? {})[0] ?? 'COP';
  const category =
    totals && 'categoriesByCurrency' in totals
      ? totals.categoriesByCurrency[currency]?.find(
          (item) => item.key === categoryKey || item.id === categoryId,
        )
      : null;
  const countQuery = useQuery({
    queryKey: ['group-report-category-count', id, categoryId, currency],
    enabled: Boolean(id && (categoryId || categoryKey)),
    queryFn: async () => {
      const response = await groupsClient[':id'].reports['category-count'].$get(
        {
          param: { id: id ?? '' },
          query: {
            range: 'all',
            currency,
            ...(categoryId ? { categoryId } : {}),
          },
        },
      );
      if (!response.ok) throw new Error('category_count_failed');
      return response.json();
    },
  });
  const name = category?.name ?? categoryName ?? 'Categoría';
  const amount = category?.amount ?? 0;
  const total = totals?.totalsByCurrency?.[currency] ?? 0;
  const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
  return (
    <Screen>
      <ScreenHeader title="Detalle de categoría" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {totalsQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={styles.title}>{name}</Text>
              <Text style={styles.amount}>
                {amount} {currency}
              </Text>
              <Text style={styles.copy}>
                {percentage}% del total del espacio
              </Text>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.title}>Historial</Text>
              <Text style={styles.copy}>
                {countQuery.data && 'expenseCount' in countQuery.data
                  ? countQuery.data.expenseCount
                  : 0}{' '}
                gastos registrados en esta categoría.
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  card: { gap: 12, padding: 20 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
});
