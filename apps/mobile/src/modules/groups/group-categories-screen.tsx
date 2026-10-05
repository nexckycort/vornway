import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
export default function GroupCategoriesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  async function add() {
    if (!id || !name.trim()) return;
    const response = await groupsClient[':id'].categories.$post({
      param: { id },
      json: { name: name.trim() },
    });
    if (!response.ok) {
      Alert.alert('No se pudo crear', 'Intenta nuevamente.');
      return;
    }
    setCategories((current) => [...current, name.trim()]);
    setName('');
  }
  return (
    <Screen>
      <ScreenHeader title="Categorías" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.form}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Nueva categoría"
          />
          <Button onPress={() => void add()}>
            <Text style={styles.buttonText}>Agregar categoría</Text>
          </Button>
        </Card>
        {categories.map((category) => (
          <Card key={category} style={styles.item}>
            <Text style={styles.title}>{category}</Text>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16 },
  form: { gap: 12, padding: 16 },
  item: { padding: 16 },
  title: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
