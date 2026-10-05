import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';
export default function GroupEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!id) return;
    void groupsClient[':id'].$get({ param: { id } }).then(async (response) => {
      if (response.ok) {
        const group = (await response.json()) as {
          name: string;
          description?: string | null;
        };
        setName(group.name);
        setDescription(group.description ?? '');
      }
      setLoading(false);
    });
  }, [id]);
  async function save() {
    if (!id || !name.trim()) return;
    setSaving(true);
    const response = await groupsClient[':id'].$patch({
      param: { id },
      json: {
        name: name.trim(),
        type: 'trip',
        description: description.trim() || undefined,
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
      <ScreenHeader title="Editar espacio" onBack={() => router.back()} />
      {loading ? (
        <Spinner color="#DE034D" />
      ) : (
        <Card style={styles.card}>
          <Label>Nombre</Label>
          <Input value={name} onChangeText={setName} />
          <Label>Descripción</Label>
          <Input value={description} onChangeText={setDescription} />
          <Button disabled={saving} onPress={() => void save()}>
            {saving ? (
              <Spinner color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Guardar cambios</Text>
            )}
          </Button>
        </Card>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  card: { gap: 12, margin: 16, padding: 18 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
