import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Member = {
  id: string;
  name: string;
  user?: { name?: string | null } | null;
};
export default function GroupParticipantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!id) return;
    const response = await groupsClient[':id'].$get({ param: { id } });
    if (response.ok)
      setMembers(
        ((await response.json()) as { members?: Member[] }).members ?? [],
      );
    setLoading(false);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function add() {
    if (!id || !name.trim()) return;
    const response = await groupsClient[':id'].members.$post({
      param: { id },
      json: { name: name.trim() },
    });
    if (!response.ok) {
      Alert.alert('No se pudo agregar', 'Intenta nuevamente.');
      return;
    }
    setName('');
    void load();
  }
  async function remove(memberId: string) {
    if (!id) return;
    const response = await groupsClient[':id'].members[':memberId'].$delete({
      param: { id, memberId },
    });
    if (response.ok)
      setMembers((current) =>
        current.filter((member) => member.id !== memberId),
      );
  }
  return (
    <Screen>
      <ScreenHeader title="Participantes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <Spinner color="#DE034D" />
        ) : (
          <>
            <Card style={styles.form}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="Nombre del participante"
              />
              <Button onPress={() => void add()}>
                <Text style={styles.buttonText}>Agregar participante</Text>
              </Button>
            </Card>
            {members.map((member) => (
              <Card key={member.id} style={styles.row}>
                <Text style={styles.name}>
                  {member.user?.name || member.name}
                </Text>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => void remove(member.id)}
                >
                  <Text style={styles.remove}>Eliminar</Text>
                </Button>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, padding: 16, paddingBottom: 152 },
  form: { gap: 12, padding: 16 },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  name: { color: '#0F172A', flex: 1, fontSize: 15, fontWeight: '600' },
  remove: { color: '#B91C1C', fontSize: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
