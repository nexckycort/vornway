import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type DateFilterMode = 'all' | 'day' | 'range';

function toBoundary(value: string, end: boolean) {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

type CategoryExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category?: {
    id?: string | null;
    name?: string | null;
    icon?: string | null;
    color?: string | null;
  } | null;
};

export default function GroupCategoryReportScreen() {
  const {
    id,
    categoryKey,
    categoryId,
    categoryName,
    uncategorized,
    currency: initialCurrency,
    startDate: initialStartDate,
    endDate: initialEndDate,
  } = useLocalSearchParams<{
    id: string;
    categoryKey?: string;
    categoryId?: string;
    categoryName?: string;
    uncategorized?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
  }>();
  const router = useRouter();
  const [startDate, setStartDate] = useState(
    initialStartDate?.slice(0, 10) ?? '',
  );
  const [endDate, setEndDate] = useState(initialEndDate?.slice(0, 10) ?? '');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>(
    initialStartDate || initialEndDate ? 'range' : 'all',
  );
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialCurrency ?? '',
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const reportQuery = useMemo(() => {
    const rangeStart = dateFilterMode === 'day' ? selectedDay : startDate;
    const rangeEnd = dateFilterMode === 'day' ? selectedDay : endDate;
    const start = toBoundary(rangeStart, false);
    const end = toBoundary(rangeEnd, true);
    return {
      range: dateFilterMode === 'all' ? ('all' as const) : ('custom' as const),
      ...(start ? { startDate: start } : {}),
      ...(end ? { endDate: end } : {}),
    };
  }, [dateFilterMode, endDate, selectedDay, startDate]);
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
  const sharesQuery = useQuery({
    queryKey: ['group-report-shares', id, reportQuery],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].reports.shares.$get({
        param: { id: id ?? '' },
        query: reportQuery,
      });
      if (!response.ok) throw new Error('shares_load_failed');
      return (await response.json()) as {
        memberShares: Array<{
          memberId: string;
          name: string;
          categorySharesByCurrency?: Record<string, Record<string, number>>;
        }>;
      };
    },
  });
  const totals =
    totalsQuery.data && 'totalsByCurrency' in totalsQuery.data
      ? totalsQuery.data
      : null;
  const currencies = Object.keys(totals?.totalsByCurrency ?? {});
  const currency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : (currencies[0] ?? 'COP');
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
            ...(uncategorized === 'true' ? { uncategorized: 'true' } : {}),
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
  const categoryColor =
    ('fill' in (category ?? {}) ? category?.fill : null) ?? '#14B8A6';
  const categoryIcon =
    ('icon' in (category ?? {}) ? category?.icon : null) ?? '🏷️';
  const total = totals?.totalsByCurrency?.[currency] ?? 0;
  const percentage = total > 0 ? Math.round((amount / total) * 100) : 0;
  const members =
    groupQuery.data && 'members' in groupQuery.data
      ? groupQuery.data.members
      : [];
  const participantShares = sharesQuery.data?.memberShares ?? [];
  const historyQuery = useQuery({
    queryKey: [
      'group-report-category-history',
      id,
      categoryId,
      categoryKey,
      reportQuery,
      selectedParticipantIds,
    ],
    enabled: Boolean(id && (categoryId || categoryKey) && members.length > 0),
    queryFn: async () => {
      const memberIds =
        selectedParticipantIds.length > 0
          ? selectedParticipantIds
          : members.map((member) => member.id);
      const responses = await Promise.all(
        memberIds.map(async (memberId) => {
          const response = await groupsClient[':id'].members[
            ':memberId'
          ].expenses.$get({
            param: { id: id ?? '', memberId },
            query: {
              limit: '100',
              ...(reportQuery.startDate
                ? { startDate: reportQuery.startDate }
                : {}),
              ...(reportQuery.endDate ? { endDate: reportQuery.endDate } : {}),
            },
          });
          if (!response.ok) return [] as CategoryExpense[];
          const result = (await response.json()) as {
            data?: CategoryExpense[];
          };
          return result.data ?? [];
        }),
      );
      const unique = new Map<string, CategoryExpense>();
      for (const expense of responses.flat()) unique.set(expense.id, expense);
      return Array.from(unique.values())
        .filter((expense) => {
          if (expense.currency !== currency) return false;
          if (categoryId) return expense.category?.id === categoryId;
          if (uncategorized === 'true' || categoryKey === 'uncategorized') {
            return !expense.category;
          }
          return expense.category?.name === name;
        })
        .sort(
          (left, right) =>
            new Date(right.date).getTime() - new Date(left.date).getTime(),
        );
    },
  });
  const historyExpenses = historyQuery.data ?? [];
  return (
    <Screen>
      <ScreenHeader
        title="Detalle de categoría"
        onBack={() => router.replace(`/groups/${id}/reports` as never)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {totalsQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : totalsQuery.isError || groupQuery.isError || sharesQuery.isError ? (
          <Card style={styles.card}>
            <Text style={styles.copy}>No pudimos cargar la categoría.</Text>
            <Button
              onPress={() => {
                void totalsQuery.refetch();
                void groupQuery.refetch();
                void sharesQuery.refetch();
              }}
            >
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : (
          <>
            {currencies.length > 1 ? (
              <Card style={styles.currencyCard}>
                <Text style={styles.copy}>Moneda</Text>
                {currencies.map((item) => (
                  <Button
                    key={item}
                    variant={item === currency ? 'default' : 'outline'}
                    onPress={() => setSelectedCurrency(item)}
                  >
                    <Text
                      style={
                        item === currency
                          ? styles.buttonText
                          : styles.outlineText
                      }
                    >
                      {item}
                    </Text>
                  </Button>
                ))}
              </Card>
            ) : null}
            <Card style={styles.card}>
              <View style={styles.categoryHeader}>
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${categoryColor}22` },
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{categoryIcon}</Text>
                </View>
                <Text style={styles.title}>{name}</Text>
              </View>
              <Text style={styles.amount}>
                {amount} {currency}
              </Text>
              <Text style={styles.copy}>
                {percentage}% del total del espacio
              </Text>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.title}>Filtros</Text>
              <View style={styles.filterModes}>
                {(
                  [
                    ['all', 'Todas'],
                    ['day', 'Día'],
                    ['range', 'Rango'],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={dateFilterMode === value ? 'default' : 'outline'}
                    onPress={() => setDateFilterMode(value)}
                  >
                    <Text
                      style={
                        dateFilterMode === value
                          ? styles.buttonText
                          : styles.outlineText
                      }
                    >
                      {label}
                    </Text>
                  </Button>
                ))}
              </View>
              {dateFilterMode === 'day' ? (
                <Input
                  value={selectedDay}
                  onChangeText={setSelectedDay}
                  placeholder="Día (AAAA-MM-DD)"
                />
              ) : null}
              {dateFilterMode === 'range' ? (
                <>
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
                </>
              ) : null}
              <Button
                variant="outline"
                onPress={() => {
                  setDateFilterMode('all');
                  setSelectedDay('');
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
                const share = participantShares.find(
                  (item) => item.memberId === member.id,
                );
                const categoryShareKey =
                  uncategorized === 'true'
                    ? 'Sin categoría::'
                    : (categoryKey ?? (categoryId || 'Sin categoría::'));
                const memberAmount =
                  share?.categorySharesByCurrency?.[currency]?.[
                    categoryShareKey
                  ] ?? 0;
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
                      {member.name} · {memberAmount} {currency}
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
              {historyQuery.isLoading ? (
                <Spinner color="#DE034D" />
              ) : historyExpenses.length === 0 ? (
                <Text style={styles.copy}>No hay gastos en este filtro.</Text>
              ) : (
                historyExpenses.map((expense) => (
                  <Button
                    key={expense.id}
                    variant="ghost"
                    onPress={() =>
                      router.push(
                        `/groups/${id}/expense/${expense.id}` as never,
                      )
                    }
                  >
                    <Text style={styles.historyTitle}>
                      {expense.description}
                    </Text>
                    <Text style={styles.copy}>
                      {expense.amount} {expense.currency} ·{' '}
                      {new Date(expense.date).toLocaleDateString('es-CO')}
                    </Text>
                  </Button>
                ))
              )}
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
  categoryHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  categoryEmoji: { fontSize: 22 },
  currencyCard: { gap: 8, padding: 16 },
  filterModes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { color: '#0F172A', fontSize: 20, fontWeight: '600' },
  amount: { color: '#DE034D', fontSize: 28, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14 },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  historyTitle: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
});
