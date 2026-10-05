import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';

export default function GroupCreateScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [spaceType, setSpaceType] = useState<'trip' | 'personal'>('trip');
  function submit() {
    if (!name.trim()) return;
    router.push({
      pathname: '/groups/new/participants',
      params: {
        name: name.trim(),
        type: spaceType,
        description: description.trim(),
      },
    } as never);
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
        <Label>Tipo de espacio</Label>
        <Button
          variant={spaceType === 'trip' ? 'default' : 'outline'}
          onPress={() => setSpaceType('trip')}
        >
          <Text style={styles.buttonText}>Compartido</Text>
        </Button>
        <Button
          variant={spaceType === 'personal' ? 'default' : 'outline'}
          onPress={() => setSpaceType('personal')}
        >
          <Text style={styles.buttonText}>Personal</Text>
        </Button>
        <Label>Descripción</Label>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Opcional"
        />
        <Button onPress={submit}>
          <Text style={styles.buttonText}>Continuar con participantes</Text>
        </Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  hint: { color: '#64748B', fontSize: 12 },
});
