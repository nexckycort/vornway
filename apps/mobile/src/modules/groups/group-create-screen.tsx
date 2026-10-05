import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

export default function GroupCreateScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    const response = await groupsClient.index.$post({
      json: {
        name: name.trim(),
        type: 'trip',
        description: description.trim() || undefined,
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
      <ScreenHeader title="Nuevo espacio" onBack={() => router.back()} />
      <Card style={styles.card}>
        <Label>Nombre</Label>
        <Input
          value={name}
          onChangeText={setName}
          placeholder="Viaje a Cartagena"
        />
        <Label>Descripción</Label>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Opcional"
        />
        <Button disabled={saving} onPress={() => void submit()}>
          {saving ? (
            <Spinner color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Crear espacio</Text>
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
