import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { toDayBoundary } from '@/modules/groups/date-boundary';

type Tab = 'balance' | 'totals';
type DateFilterMode = 'all' | 'day' | 'range';
export default function GroupReportsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('balance');
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('all');
  const [selectedDay, setSelectedDay] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const groupQuery = useQuery({
    ...api.groups.get.queryOptions({ params: { id: id ?? '' } }),
    enabled: Boolean(id),
  });
  const isPersonalSpace = groupQuery.data?.type === 'personal';
  const activeTab: Tab = isPersonalSpace ? 'totals' : tab;
  const reportRange = useMemo(() => {
    const rangeStart = dateFilterMode === 'day' ? selectedDay : startDate;
    const rangeEnd = dateFilterMode === 'day' ? selectedDay : endDate;
    const start = toDayBoundary(rangeStart, false);
    const end = toDayBoundary(rangeEnd, true);
    return {
      range: dateFilterMode === 'all' ? ('all' as const) : ('custom' as const),
      ...(start ? { startDate: start } : {}),
      ...(end ? { endDate: end } : {}),
    };
  }, [dateFilterMode, endDate, selectedDay, startDate]);
  const totalsQuery = useQuery({
    ...api.groups.reportTotals.queryOptions({
      params: { id: id ?? '' },
      query: reportRange,
    }),
    enabled: Boolean(id),
  });
  const balancesQuery = useQuery({
    ...api.groups.reportBalances.queryOptions({
      params: { id: id ?? '' },
      query: reportRange,
    }),
    enabled: Boolean(id) && activeTab === 'balance',
  });
  const sharesQuery = useQuery({
    ...api.groups.reportShares.queryOptions({
      params: { id: id ?? '' },
      query: reportRange,
    }),
    enabled: Boolean(id) && activeTab === 'totals',
  });
  const totals = totalsQuery.data ?? null;
  const currencies = Object.keys(totals?.totalsByCurrency ?? {});
  const currency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : (currencies[0] ?? 'COP');
  const categories = totals?.categoriesByCurrency[currency] ?? [];
  const categoryTotal = categories.reduce(
    (total, category) => total + Math.max(0, category.amount),
    0,
  );
  const balances = balancesQuery.data ?? null;
  const shares = sharesQuery.data ?? null;
  const loading =
    totalsQuery.isLoading ||
    (activeTab === 'balance' && balancesQuery.isLoading) ||
    (activeTab === 'totals' && sharesQuery.isLoading);

  return (
    <Screen>
      <ScreenHeader
        title="Reportes"
        onBack={() => router.replace(`/groups/${id}` as never)}
      />
      <View style={styles.tabs}>
        {!isPersonalSpace ? (
          <Button
            variant={activeTab === 'balance' ? 'default' : 'outline'}
            onPress={() => setTab('balance')}
          >
            <Text style={styles.buttonText}>Balance</Text>
          </Button>
        ) : null}
        <Button
          variant={activeTab === 'totals' ? 'default' : 'outline'}
          onPress={() => setTab('totals')}
        >
          <Text style={styles.buttonText}>Totales</Text>
        </Button>
      </View>
      {currencies.length > 1 ? (
        <View style={styles.currencyTabs}>
          {currencies.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={item === currency ? 'default' : 'outline'}
              onPress={() => setSelectedCurrency(item)}
            >
              <Text
                style={
                  item === currency ? styles.buttonText : styles.outlineText
                }
              >
                {item}
              </Text>
            </Button>
          ))}
        </View>
      ) : null}
      <Card style={styles.filterCard}>
        <Text style={styles.title}>Filtrar por fechas</Text>
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
          }}
        >
          <Text style={styles.outlineText}>Todas las fechas</Text>
        </Button>
      </Card>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <Spinner color="#DE034D" /> : null}
        {totalsQuery.isError || balancesQuery.isError || sharesQuery.isError ? (
          <Card style={styles.card}>
            <Text style={styles.copy}>No pudimos cargar este reporte.</Text>
            <Button
              onPress={() => {
                void totalsQuery.refetch();
                if (activeTab === 'balance') void balancesQuery.refetch();
                else void sharesQuery.refetch();
              }}
            >
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : null}
        {activeTab === 'totals' && totals ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.title}>Total del espacio</Text>
              <Text style={styles.amount}>
                {totals.totalsByCurrency?.[currency] ?? 0} {currency}
              </Text>
              <Text style={styles.copy}>
                {totals.expenseCountByCurrency?.[currency] ?? 0} gastos
              </Text>
              <Text style={styles.copy}>
                Tu consumo: {totals.currentUserSpentByCurrency?.[currency] ?? 0}{' '}
                {currency}
              </Text>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.title}>Participación por persona</Text>
              {(shares?.memberShares ?? []).map((member) => (
                <Button
                  key={member.memberId}
                  variant="ghost"
                  onPress={() =>
                    router.push(
                      `/groups/${id}/member/${member.memberId}` as never,
                    )
                  }
                >
                  <View style={styles.row}>
                    <Text style={styles.copy}>{member.name}</Text>
                    <Text style={styles.copy}>
                      {member.shares[currency] ?? 0} {currency}
                    </Text>
                  </View>
                </Button>
              ))}
            </Card>
            {(totals.tagsByCurrency?.[currency] ?? []).length > 0 ? (
              <Card style={styles.card}>
                <Text style={styles.title}>Por etiqueta</Text>
                {totals.tagsByCurrency?.[currency]?.map((tag) => (
                  <View key={tag.key} style={styles.row}>
                    <Text style={styles.copy}>{tag.name}</Text>
                    <Text style={styles.copy}>
                      {tag.amount} {currency}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : null}
            <Card style={styles.card}>
              <Text style={styles.title}>Por categoría</Text>
              {categories.length === 0 ? (
                <Text style={styles.copy}>Sin gastos categorizados.</Text>
              ) : null}
              {categories.length > 0 ? (
                <View style={styles.chart}>
                  {categories.map((category) => {
                    const percentage =
                      categoryTotal > 0
                        ? (Math.max(0, category.amount) / categoryTotal) * 100
                        : 0;
                    return (
                      <View
                        key={`chart-${category.key}`}
                        style={styles.chartRow}
                      >
                        <View style={styles.row}>
                          <Text numberOfLines={1} style={styles.copy}>
                            {category.name}
                          </Text>
                          <Text style={styles.copy}>
                            {formatReportAmount(category.amount, currency)}
                          </Text>
                        </View>
                        <View style={styles.chartTrack}>
                          <View
                            style={[
                              styles.chartBar,
                              {
                                backgroundColor: category.fill ?? '#DE034D',
                                width: `${percentage}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
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
                        currency,
                        ...(dateFilterMode === 'day' && selectedDay
                          ? { startDate: selectedDay, endDate: selectedDay }
                          : dateFilterMode === 'range'
                            ? {
                                ...(startDate ? { startDate } : {}),
                                ...(endDate ? { endDate } : {}),
                              }
                            : {}),
                        ...(category.id == null
                          ? { uncategorized: 'true' }
                          : {}),
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
        {activeTab === 'balance' ? (
          <>
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
            <Button
              onPress={() => router.push(`/groups/${id}/settle` as never)}
            >
              <Text style={styles.buttonText}>Liquidar saldos</Text>
            </Button>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  currencyTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: { gap: 12, padding: 20 },
  filterCard: { gap: 10, marginHorizontal: 16, padding: 16 },
  chart: { gap: 8 },
  chartRow: { gap: 2 },
  chartTrack: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  chartBar: { borderRadius: 999, height: 8, minWidth: 2 },
  filterModes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});

function formatReportAmount(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString('es-CO')} ${currency}`;
  }
}
