import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

import { goalsClient } from '@/api/goals';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Screen } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Goal = {
  id: string;
  title: string;
  description?: string | null;
  currency: string;
  targetAmount: number;
  savedAmount: number;
  progress?: number;
};
export default function GoalsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const goalsQuery = useQuery({
    queryKey: ['goals-list', search.trim()],
    queryFn: async () => {
      const response = await goalsClient.index.$get({
        query: {
          limit: '50',
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      if (!response.ok) throw new Error('goals_load_failed');
      return (await response.json()) as unknown as { data: Goal[] };
    },
  });
  const goals = goalsQuery.data?.data ?? [];
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={goalsQuery.isRefetching}
            onRefresh={() => void goalsQuery.refetch()}
          />
        }
      >
        <Text style={styles.heading}>Metas</Text>
        <Button onPress={() => router.push('/goals/new' as never)}>
          <Text style={styles.buttonText}>＋ Crear meta</Text>
        </Button>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar metas"
          style={styles.search}
        />
        {goalsQuery.isLoading ? (
          <Spinner color="#DE034D" />
        ) : goalsQuery.isError ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>No se pudieron cargar las metas</Text>
            <Button onPress={() => void goalsQuery.refetch()}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Button>
          </Card>
        ) : goals.length === 0 ? (
          <Card style={styles.empty}>
            <Text style={styles.title}>Aún no tienes metas</Text>
            <Text style={styles.copy}>
              Crea una meta para preparar tu próximo viaje.
            </Text>
            <Button onPress={() => router.push('/goals/new' as never)}>
              <Text style={styles.buttonText}>Crear meta</Text>
            </Button>
          </Card>
        ) : (
          goals.map((goal) => {
            const progress =
              goal.progress ?? goal.savedAmount / goal.targetAmount;
            return (
              <Card key={goal.id} style={styles.card}>
                <Text style={styles.title}>{goal.title}</Text>
                <Text style={styles.copy}>
                  {goal.description ||
                    `${goal.savedAmount} de ${goal.targetAmount} ${goal.currency}`}
                </Text>
                <Progress value={progress * 100} />
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => router.push(`/goals/${goal.id}` as never)}
                >
                  <Text style={styles.link}>Ver meta</Text>
                </Button>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  heading: { color: '#0F172A', fontSize: 30, fontWeight: '600' },
  search: { backgroundColor: '#FFFFFF', borderRadius: 24, height: 44 },
  card: { gap: 10, padding: 18 },
  empty: { alignItems: 'center', gap: 12, padding: 24 },
  title: { color: '#0F172A', fontSize: 17, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  link: { color: '#DE034D', fontSize: 13, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
