import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { goalsClient } from '@/api/goals';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GoalCreateScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    const target = Number(targetAmount.replace(',', '.'));
    if (!name.trim() || !Number.isFinite(target) || target <= 0) return;
    setSaving(true);
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    const response = await goalsClient.index.$post({
      json: {
        name: name.trim(),
        currency: 'COP',
        targetAmount: target,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        installmentCount: 1,
        goalType: 'saving',
        contributionMode: 'manual',
        participants: [],
      },
    });
    setSaving(false);
    if (!response.ok) {
      Alert.alert('No se pudo crear', 'Intenta nuevamente.');
      return;
    }
    router.back();
  }
  return (
    <Screen>
      <ScreenHeader title="Nueva meta" onBack={() => router.back()} />
      <Card style={styles.card}>
        <Label>Nombre</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Viaje a Europa"
        />
        <Label>Monto objetivo</Label>
        <Input
          value={targetAmount}
          onChangeText={setTargetAmount}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Button disabled={saving} onPress={() => void submit()}>
          {saving ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Crear meta</Text>
          )}
        </Button>
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
