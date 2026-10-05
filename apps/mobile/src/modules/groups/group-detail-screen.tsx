import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('No se pudo cargar el espacio');
      return response.json();
    },
  });
  const expensesQuery = useQuery({
    queryKey: ['group-expenses', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].expenses.$get({
        param: { id: id ?? '' },
        query: { limit: '50' },
      });
      if (!response.ok) throw new Error('No se pudieron cargar los gastos');
      return response.json();
    },
  });
  const group =
    groupQuery.data && 'name' in groupQuery.data ? groupQuery.data : null;
  const expenses =
    expensesQuery.data && 'data' in expensesQuery.data
      ? expensesQuery.data.data
      : [];
  return (
    <Screen>
      <ScreenHeader
        title={group?.name ?? 'Espacio'}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!groupQuery.isFetched ? <Spinner color="#DE034D" /> : null}
        {group ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.copy}>
                {group.description || 'Organiza aquí los detalles de tu viaje.'}
              </Text>
              <Button
                onPress={() =>
                  router.push(`/groups/${id}/add-expense` as never)
                }
              >
                <Text style={styles.buttonText}>＋ Agregar gasto</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() =>
                  router.push(`/groups/${id}/participants` as never)
                }
              >
                <Text style={styles.outlineText}>
                  Participantes ({group.participantCount})
                </Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => router.push(`/groups/${id}/reports` as never)}
              >
                <Text style={styles.outlineText}>Ver reportes</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => router.push(`/groups/${id}/edit` as never)}
              >
                <Text style={styles.outlineText}>Editar espacio</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => router.push(`/groups/${id}/settings` as never)}
              >
                <Text style={styles.outlineText}>Configuración</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => router.push(`/groups/${id}/settle` as never)}
              >
                <Text style={styles.outlineText}>Liquidar saldos</Text>
              </Button>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.section}>Saldos</Text>
              {group.memberBalances.map((member) => (
                <Button
                  key={member.memberId}
                  variant="ghost"
                  onPress={() =>
                    router.push(
                      `/groups/${id}/member/${member.memberId}` as never,
                    )
                  }
                >
                  <Text style={styles.copy}>
                    {member.name}:{' '}
                    {Object.entries(member.balances)
                      .map(([currency, amount]) => `${amount} ${currency}`)
                      .join(' · ') || '0'}
                  </Text>
                </Button>
              ))}
            </Card>
            <Card style={styles.card}>
              <Text style={styles.section}>Gastos recientes</Text>
              {expenses.length === 0 ? (
                <Text style={styles.copy}>Aún no hay gastos.</Text>
              ) : null}
              {expenses.map((expense) => (
                <Button
                  key={expense.id}
                  variant="ghost"
                  onPress={() =>
                    router.push(`/groups/${id}/expense/${expense.id}` as never)
                  }
                >
                  <Text style={styles.copy}>
                    {expense.description} · {expense.amount} {expense.currency}
                  </Text>
                </Button>
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  card: { gap: 10, padding: 18 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  section: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
