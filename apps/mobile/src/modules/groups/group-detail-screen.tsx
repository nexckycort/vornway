import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { groupsClient } from '@/api/groups';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen, ScreenHeader } from '@/components/ui/screen';
import { Spinner } from '@/components/ui/spinner';

type Group = {
  name: string;
  description?: string | null;
  members?: Array<{ id?: string; name: string }>;
  expenses?: Array<{
    id: string;
    description: string;
    amount: number;
    currency: string;
  }>;
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  useEffect(() => {
    if (!id) return;
    void groupsClient[':id'].$get({ param: { id } }).then(async (response) => {
      if (response.ok) setGroup((await response.json()) as Group);
    });
  }, [id]);
  return (
    <Screen>
      <ScreenHeader
        title={group?.name ?? 'Espacio'}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!group ? (
          <Spinner color="#DE034D" />
        ) : (
          <>
            <Card style={styles.card}>
              <Text style={styles.title}>{group.name}</Text>
              <Text style={styles.copy}>
                {group.description || 'Organiza aquí los detalles de tu viaje.'}
              </Text>
              <Button
                onPress={() =>
                  router.push(`/groups/${id}/add-expense` as never)
                }
              >
                <Text style={styles.buttonText}>＋ Agregar gasto</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() =>
                  router.push(`/groups/${id}/participants` as never)
                }
              >
                <Text style={styles.outlineText}>Participantes</Text>
              </Button>
              <Button
                variant="outline"
                onPress={() => router.push(`/groups/${id}/reports` as never)}
              >
                <Text style={styles.outlineText}>Ver reportes</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => router.push(`/groups/${id}/edit` as never)}
              >
                <Text style={styles.outlineText}>Editar espacio</Text>
              </Button>
              <Button
                variant="ghost"
                onPress={() => router.push(`/groups/${id}/settings` as never)}
              >
                <Text style={styles.outlineText}>Configuración</Text>
              </Button>
            </Card>
            <Card style={styles.card}>
              <Text style={styles.section}>Participantes</Text>
              {group.members?.map((member) => (
                <Text key={member.id ?? member.name} style={styles.copy}>
                  {member.name}
                </Text>
              ))}
            </Card>
            <Card style={styles.card}>
              <Text style={styles.section}>Gastos</Text>
              {group.expenses?.length ? (
                group.expenses.map((expense) => (
                  <Button
                    key={expense.id}
                    variant="ghost"
                    onPress={() =>
                      router.push(
                        `/groups/${id}/expense/${expense.id}` as never,
                      )
                    }
                  >
                    <Text style={styles.copy}>
                      {expense.description} · {expense.amount}{' '}
                      {expense.currency}
                    </Text>
                  </Button>
                ))
              ) : (
                <Text style={styles.copy}>Aún no hay gastos.</Text>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, padding: 16, paddingBottom: 152 },
  card: { gap: 10, padding: 18 },
  title: { color: '#0F172A', fontSize: 22, fontWeight: '600' },
  section: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  copy: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlineText: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
});
