import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { goalsClient } from '@/api/goals';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Goal = {
  title: string;
  description?: string | null;
  targetAmount: number;
  currentAmount?: number;
  currency: string;
  progress?: number;
};
export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<Goal | null>(null);
  useEffect(() => {
    if (!id) return;
    void goalsClient[':id'].$get({ param: { id } }).then(async (response) => {
      if (response.ok) setGoal((await response.json()) as unknown as Goal);
    });
  }, [id]);
  const progress = goal
    ? (goal.progress ?? (goal.currentAmount ?? 0) / goal.targetAmount)
    : 0;
  return (
    <Screen>
      <ScreenHeader
        title={goal?.title ?? 'Meta'}
        onBack={() => router.back()}
      />
      {goal ? (
        <Card style={styles.card}>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.copy}>
            {goal.description || 'Sigue avanzando hacia tu objetivo.'}
          </Text>
          <Progress value={progress * 100} />
          <Text style={styles.copy}>
            {goal.currentAmount ?? 0} de {goal.targetAmount} {goal.currency}
          </Text>
        </Card>
      ) : (
        <Spinner color="#DE034D" />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 14, margin: 16, padding: 20 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
});
