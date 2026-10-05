import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const groupQuery = useQuery({
    queryKey: ['group-summary', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const response = await groupsClient[':id'].$get({
        param: { id: id ?? '' },
      });
      if (!response.ok) throw new Error('load_failed');
      return response.json();
    },
  });
  const group =
    groupQuery.data && 'advancedExpenseDetailsEnabled' in groupQuery.data
      ? groupQuery.data
      : null;
  const mutation = useMutation({
    mutationFn: async (value: boolean) => {
      const response = await groupsClient[':id'].settings.$patch({
        param: { id: id ?? '' },
        json: { advancedExpenseDetailsEnabled: value },
      });
      if (!response.ok) throw new Error('save_failed');
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['group-summary', id] }),
  });
  return (
    <Screen>
      <ScreenHeader title="Configuración" onBack={() => router.back()} />
      {groupQuery.isLoading ? (
        <Spinner color="#DE034D" />
      ) : (
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.title}>Detalles avanzados</Text>
              <Text style={styles.description}>
                Permite registrar categorías y detalles adicionales en los
                gastos.
              </Text>
            </View>
            <Switch
              value={group?.advancedExpenseDetailsEnabled ?? false}
              onValueChange={(value) => mutation.mutate(value)}
              trackColor={{ false: '#CBD5E1', true: '#F7A0BA' }}
              thumbColor={
                group?.advancedExpenseDetailsEnabled ? '#DE034D' : '#FFFFFF'
              }
            />
          </View>
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { margin: 16, padding: 18 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  copy: { flex: 1, gap: 6 },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  description: { color: '#64748B', fontSize: 14, lineHeight: 20 },
});
