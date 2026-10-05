import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { quickSplitsClient } from '@/api/quick-splits';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function ExpenseCreateScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [participant, setParticipant] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!name.trim() || !participant.trim()) return;
    setSaving(true);
    const response = await quickSplitsClient.index.$post({
      json: { name: name.trim(), participants: [{ name: participant.trim() }] },
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
      <ScreenHeader
        title="Nuevo gasto compartido"
        onBack={() => router.back()}
      />
      <Card style={styles.card}>
        <Label>Nombre del grupo</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Cena con amigos"
        />
        <Label>Primer participante</Label>
        <Input
          value={participant}
          onChangeText={setParticipant}
          placeholder="Nombre"
        />
        <Button disabled={saving} onPress={() => void submit()}>
          {saving ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Continuar</Text>
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
