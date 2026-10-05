import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Report = {
  total?: number;
  totalAmount?: number;
  currency?: string;
  balances?: Array<{ name?: string; amount?: number; label?: string }>;
};
export default function GroupReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => {
    if (!id) return;
    void groupsClient[':id'].reports.totals
      .$get({ param: { id }, query: { range: 'all' } })
      .then(async (response) => {
        if (response.ok)
          setReport((await response.json()) as unknown as Report);
      });
  }, [id]);
  return (
    <Screen>
      <ScreenHeader title="Reportes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {report ? (
          <Card style={styles.card}>
            <Text style={styles.title}>Resumen del espacio</Text>
            <Text style={styles.amount}>
              {report.totalAmount ?? report.total ?? 0}{' '}
              {report.currency ?? 'COP'}
            </Text>
            {report.balances?.map((balance) => (
              <Text
                key={balance.name ?? balance.label ?? String(balance.amount)}
                style={styles.copy}
              >
                {balance.name ?? balance.label}: {balance.amount ?? 0}
              </Text>
            ))}
          </Card>
        ) : (
          <Spinner color="#DE034D" />
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { padding: 16 },
  card: { gap: 12, padding: 20 },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
});
