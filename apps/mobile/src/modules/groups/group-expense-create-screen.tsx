import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
export default function GroupExpenseCreateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    const parsedAmount = Number(amount.replace(',', '.'));
    if (
      !id ||
      !description.trim() ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    )
      return;
    setSaving(true);
    const response = await groupsClient[':id'].expenses.$post({
      param: { id },
      json: {
        description: description.trim(),
        amount: parsedAmount,
        currency: 'COP',
        participantIds: [],
        splitMethod: 'equal',
      },
    });
    setSaving(false);
    if (!response.ok) {
      Alert.alert('No se pudo guardar', 'Intenta nuevamente.');
      return;
    }
    router.back();
  }
  return (
    <Screen>
      <ScreenHeader title="Nuevo gasto" onBack={() => router.back()} />
      <Card style={styles.card}>
        <Label>Descripción</Label>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Cena, transporte..."
        />
        <Label>Monto</Label>
        <Input
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <Button disabled={saving} onPress={() => void submit()}>
          {saving ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Guardar gasto</Text>
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
