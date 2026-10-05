import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    void groupsClient[':id']
      .$get({ param: { id } })
      .then(() => setLoading(false));
  }, [id]);
  async function toggle(value: boolean) {
    if (!id) return;
    setEnabled(value);
    const response = await groupsClient[':id'].settings.$patch({
      param: { id },
      json: { advancedExpenseDetailsEnabled: value },
    });
    if (!response.ok) {
      setEnabled(!value);
      Alert.alert('No se pudo actualizar', 'Intenta nuevamente.');
    }
  }
  return (
    <Screen>
      <ScreenHeader title="Configuración" onBack={() => router.back()} />
      {loading ? (
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
              value={enabled}
              onValueChange={(value) => void toggle(value)}
              trackColor={{ false: '#CBD5E1', true: '#F7A0BA' }}
              thumbColor={enabled ? '#DE034D' : '#FFFFFF'}
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
