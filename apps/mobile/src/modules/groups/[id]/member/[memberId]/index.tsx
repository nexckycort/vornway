import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ApiSuccess } from '@vornway/api-client';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { toDayBoundary } from '@/modules/groups/date-boundary';

type Expense = ApiSuccess<'groups', 'listMemberExpenses'>['data'][number];

export default function GroupMemberExpensesScreen() {
  const { id, memberId, categoryId, categoryName, uncategorized } =
    useLocalSearchParams<{
      id: string;
      memberId: string;
      categoryId?: string;
      categoryName?: string;
      uncategorized?: string;
    }>();
  const router = useRouter();
  const [paidOnly, setPaidOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const groupQuery = useQuery({
    ...api.groups.get.queryOptions({ params: { id: id ?? '' } }),
    enabled: Boolean(id),
  });
  const start = toDayBoundary(startDate, false);
  const end = toDayBoundary(endDate, true);
  const expensesQuery = useInfiniteQuery({
    ...api.groups.listMemberExpenses.infiniteQueryOptions({
      params: { id: id ?? '', memberId: memberId ?? '' },
      query: {
        limit: 50,
        ...(paidOnly ? { paidOnly: true } : {}),
        ...(start ? { startDate: start } : {}),
        ...(end ? { endDate: end } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(uncategorized === 'true' ? { uncategorized: true } : {}),
      },
    }),
    enabled: Boolean(id && memberId),
  });
  const member = groupQuery.data?.members.find((item) => item.id === memberId);
  const summary = expensesQuery.data?.pages[0]?.summary;
  const expenses = expensesQuery.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Screen>
      <ScreenHeader
        title={member?.name ?? 'Participante'}
        onBack={() =>
          router.replace({
            pathname: '/groups/[id]/reports',
            params: { id, tab: 'totales' },
          } as never)
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        onMomentumScrollEnd={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } =
            event.nativeEvent;
          if (
            layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 160 &&
            expensesQuery.hasNextPage &&
            !expensesQuery.isFetchingNextPage
          ) {
            void expensesQuery.fetchNextPage();
          }
        }}
      >
        {groupQuery.isLoading || expensesQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : member ? (
          <>
            <Card style={styles.card}>
              <View style={styles.memberHeader}>
                {member.image ? (
                  <Image
                    source={{ uri: member.image }}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>
                      {toInitials(member.name)}
                    </Text>
                  </View>
                )}
                <View style={styles.memberCopy}>
                  <Text style={styles.title}>
                    {member.name}
                    {member.isCurrentUser ? ' · Tú' : ''}
                  </Text>
                  <Text style={styles.copy}>
                    {member.email ?? 'Participante sin correo'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionTitle}>
                Resumen{categoryName ? ` · ${categoryName}` : ''}
              </Text>
              <Text style={styles.copy}>
                {paidOnly
                  ? 'Gastos pagados por este participante.'
                  : 'Gastos relacionados con este participante.'}
              </Text>
              {Object.entries(summary?.spentByCurrency ?? {}).map(
                ([currency, value]) => (
                  <Text key={`spent-${currency}`} style={styles.copy}>
                    {paidOnly ? 'Parte: ' : 'Gastado: '}
                    {value} {currency}
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
              {Object.keys(summary?.spentByCurrency ?? {}).length === 0 &&
              Object.keys(summary?.grossPaidByCurrency ?? {}).length === 0 ? (
                <Text style={styles.copy}>
                  No hay resumen para estos filtros.
                </Text>
              ) : null}
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
                    {expenseDetails(expense, memberId).map((detail) => (
                      <Text key={detail} style={styles.detailCopy}>
                        {detail}
                      </Text>
                    ))}
                  </Button>
                ))
              )}
              {expensesQuery.isFetchingNextPage ? (
                <Spinner color="#DE034D" />
              ) : null}
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
  memberHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  memberCopy: { flex: 1, gap: 2 },
  avatar: { borderRadius: 24, height: 48, width: 48 },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  avatarText: { color: '#132238', fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  detailCopy: { color: '#94A3B8', fontSize: 12, lineHeight: 17 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 13, fontWeight: '600' },
});

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function expenseDetails(expense: Expense, memberId: string) {
  const paidAmount =
    expense.paidByMembers?.find((payer) => payer.memberId === memberId)
      ?.amount ?? (expense.paidBy?.id === memberId ? expense.amount : 0);
  const shareAmount =
    expense.participants?.find(
      (participant) => participant.memberId === memberId,
    )?.share ?? 0;
  return [
    paidAmount > 0 ? `Pagó ${paidAmount} ${expense.currency}` : null,
    shareAmount > 0 ? `Su parte ${shareAmount} ${expense.currency}` : null,
  ].filter((value): value is string => Boolean(value));
}
