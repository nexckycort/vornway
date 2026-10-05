import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

function toBoundary(value: string, end: boolean) {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function GroupCategoryReportScreen() {
  const { id, categoryKey, categoryId, categoryName } = useLocalSearchParams<{
    id: string;
    categoryKey?: string;
    categoryId?: string;
    categoryName?: string;
  }>();
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const reportQuery = useMemo(() => {
    const start = toBoundary(startDate, false);
    const end = toBoundary(endDate, true);
    return {
      range: start && end ? ('custom' as const) : ('all' as const),
      ...(start ? { startDate: start } : {}),
      ...(end ? { endDate: end } : {}),
    };
  }, [endDate, startDate]);
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
  const totalsQuery = useQuery({
    queryKey: ['group-report-totals', id, reportQuery],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].reports.totals.$get({
        param: { id: id ?? '' },
        query: reportQuery,
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
    queryKey: [
      'group-report-category-count',
      id,
      categoryId,
      currency,
      reportQuery,
      selectedParticipantIds,
    ],
    enabled: Boolean(id && (categoryId || categoryKey)),
    queryFn: async () => {
      const response = await groupsClient[':id'].reports['category-count'].$get(
        {
          param: { id: id ?? '' },
          query: {
            ...reportQuery,
            currency,
            ...(categoryId ? { categoryId } : {}),
            ...(selectedParticipantIds.length > 0
              ? { participantIds: selectedParticipantIds.join(',') }
              : {}),
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
  const members =
    groupQuery.data && 'members' in groupQuery.data
      ? groupQuery.data.members
      : [];
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
              <Text style={styles.title}>Filtros</Text>
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
                variant="outline"
                onPress={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedParticipantIds([]);
                }}
              >
                <Text style={styles.outlineText}>Limpiar filtros</Text>
              </Button>
              <Text style={styles.copy}>Participantes</Text>
              {members.map((member) => {
                const active = selectedParticipantIds.includes(member.id);
                return (
                  <Button
                    key={member.id}
                    variant={active ? 'default' : 'outline'}
                    onPress={() =>
                      setSelectedParticipantIds((current) =>
                        active
                          ? current.filter((value) => value !== member.id)
                          : [...current, member.id],
                      )
                    }
                  >
                    <Text
                      style={active ? styles.buttonText : styles.outlineText}
                    >
                      {member.name}
                    </Text>
                  </Button>
                );
              })}
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
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
